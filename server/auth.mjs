import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

const cookieName = 'jayhun_admin';
const digest = (token) => createHash('sha256').update(token).digest('hex');
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
const dummyHash = hashPassword(randomBytes(32).toString('hex'));
export function verifyPassword(password, hash) {
  const [salt, expected] = hash.split(':');
  const actual = scryptSync(password, salt, 64);
  const stored = Buffer.from(expected, 'hex');
  return stored.length === actual.length && timingSafeEqual(stored, actual);
}
export function createAdmin(db, username, password, { replace = false } = {}) {
  username = String(username || '')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9_.@-]{3,80}$/.test(username))
    throw new Error(
      'İstifadəçi adı 3–80 latın hərfi, rəqəm və ya _.@- simvolundan ibarət olmalıdır.',
    );
  if (typeof password !== 'string' || password.length < 12 || password.length > 256)
    throw new Error('Parol 12–256 simvol olmalıdır.');
  const existing = db.prepare('SELECT id FROM admin_users WHERE username=?').get(username);
  if (existing && !replace)
    throw new Error('Bu admin artıq mövcuddur. Parolu dəyişmək üçün --reset istifadə edin.');
  if (existing) {
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE admin_users SET password_hash=? WHERE id=?').run(
        hashPassword(password),
        existing.id,
      );
      db.prepare('DELETE FROM admin_sessions WHERE admin_id=?').run(existing.id);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  } else
    db.prepare('INSERT INTO admin_users VALUES (?,?,?,?)').run(
      randomUUID(),
      username,
      hashPassword(password),
      new Date().toISOString(),
    );
}

export function installAuth(app, db, { secureCookies = false } = {}) {
  const failures = new Map();
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of failures) if (v.until < now) failures.delete(k);
    db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(now);
  }, 60_000);
  cleanup.unref();
  const cookie = (token, maxAge) =>
    `${cookieName}=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secureCookies ? '; Secure' : ''}`;
  const getSession = (req) => {
    const token = (req.headers.cookie || '')
      .split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith(cookieName + '='))
      ?.slice(cookieName.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    return db
      .prepare(
        'SELECT s.*,u.username FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_id WHERE s.token_hash=? AND s.expires_at>?',
      )
      .get(digest(token), Date.now());
  };
  app.use('/api/admin', (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      const origin = req.get('origin');
      try {
        if (origin && new URL(origin).host !== req.get('host'))
          return res.status(403).json({ error: 'Sorğunun mənbəyi qəbul edilmir.' });
      } catch {
        return res.status(403).json({ error: 'Sorğunun mənbəyi düzgün deyil.' });
      }
    }
    next();
  });
  app.post('/api/admin/login', (req, res) => {
    if (!req.is('application/json'))
      return res.status(415).json({ error: 'JSON formatı tələb olunur.' });
    const key = req.ip || 'unknown',
      now = Date.now();
    const rate = failures.get(key);
    if (rate && rate.until > now && rate.count >= 10) {
      res.set('Retry-After', String(Math.ceil((rate.until - now) / 1000)));
      return res
        .status(429)
        .json({ error: 'Çox sayda giriş cəhdi edildi. 15 dəqiqə sonra yenidən yoxlayın.' });
    }
    const username =
      typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = db
      .prepare('SELECT * FROM admin_users WHERE username=?')
      .get(username.slice(0, 80));
    const valid =
      password.length <= 256 && verifyPassword(password, user?.password_hash || dummyHash);
    if (!user || !valid) {
      if (failures.size > 10_000) failures.clear();
      failures.set(key, {
        count: rate?.until > now ? rate.count + 1 : 1,
        until: rate?.until > now ? rate.until : now + 900_000,
      });
      return res.status(401).json({ error: 'İstifadəçi adı və ya parol düzgün deyil.' });
    }
    failures.delete(key);
    const token = randomBytes(32).toString('hex'),
      csrfToken = randomBytes(32).toString('hex');
    // A new login replaces the current browser session, not another device's session.
    const previous = getSession(req);
    if (previous)
      db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(previous.token_hash);
    db.prepare('INSERT INTO admin_sessions VALUES (?,?,?,?)').run(
      digest(token),
      user.id,
      csrfToken,
      now + 43_200_000,
    );
    res.setHeader('Set-Cookie', cookie(token, 43_200));
    res.json({ username: user.username, csrfToken });
  });
  app.use('/api/admin', (req, res, next) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Admin hesabına daxil olun.' });
    if (!['GET', 'HEAD'].includes(req.method) && req.get('x-csrf-token') !== session.csrf_token)
      return res.status(403).json({ error: 'Sessiya yoxlaması uğursuzdur. Səhifəni yeniləyin.' });
    req.adminSession = session;
    next();
  });
  app.get('/api/admin/session', (req, res) =>
    res.json({ username: req.adminSession.username, csrfToken: req.adminSession.csrf_token }),
  );
  app.post('/api/admin/logout', (req, res) => {
    db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(req.adminSession.token_hash);
    res.setHeader('Set-Cookie', cookie('', 0));
    res.json({ ok: true });
  });
  return () => clearInterval(cleanup);
}
