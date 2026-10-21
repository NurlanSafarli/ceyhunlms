import express from 'express';
import helmet from 'helmet';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const defaultDbPath = join(projectRoot, '.local', 'registrations.sqlite');
const courseIds = new Set(['help-desk', 'system-admin', 'network-admin', 'undecided']);
const experiences = new Set(['beginner', 'basic', 'working']);
const formats = new Set(['online', 'in-person', 'either']);

export function createApp({
  dbPath = defaultDbPath,
  production = false,
  rateLimit = 10,
  rateWindowMs = 600_000,
} = {}) {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(dbPath);
  if (dbPath !== ':memory:') chmodSync(dbPath, 0o600);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      course TEXT NOT NULL,
      experience TEXT NOT NULL,
      format TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      consent_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(email, course)
    );
  `);

  const insert = db.prepare(
    'INSERT INTO registrations (id,name,email,phone,course,experience,format,message,consent_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
  );
  const duplicate = db.prepare('SELECT 1 FROM registrations WHERE email = ? AND course = ?');
  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: production
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:'],
              fontSrc: ["'self'"],
              connectSrc: ["'self'"],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: null,
            },
          }
        : false,
      strictTransportSecurity: production ? undefined : false,
    }),
  );
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '12kb' }));

  const attempts = new Map();
  const cleanLimits = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.reset <= now) attempts.delete(key);
  }, rateWindowMs);
  cleanLimits.unref();

  app.get('/api/health', (_req, res) => {
    try {
      db.prepare('SELECT 1').get();
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  app.post('/api/registrations', (req, res) => {
    // Do not trust user-supplied forwarding headers when counting requests.
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    let attempt = attempts.get(key);
    if (!attempt || attempt.reset <= now) {
      attempt = { count: 0, reset: now + rateWindowMs };
      attempts.set(key, attempt);
    }
    attempt.count++;
    if (attempt.count > rateLimit) {
      res.setHeader('Retry-After', String(Math.ceil((attempt.reset - now) / 1000)));
      return res.status(429).json({
        error: 'Qısa müddətdə çox müraciət göndərildi. Bir neçə dəqiqə sonra yenidən cəhd edin.',
      });
    }
    if (!req.is('application/json'))
      return res.status(415).json({ error: 'Sorğu JSON formatında olmalıdır.' });
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
      return res.status(400).json({ error: 'Müraciət məlumatları düzgün deyil.' });

    const body = req.body;
    const clean = (field) => (typeof body[field] === 'string' ? body[field].trim() : '');
    if (clean('website')) return res.status(400).json({ error: 'Müraciəti yenidən yoxlayın.' });
    const name = clean('name').replace(/\s+/g, ' ');
    const email = clean('email').toLowerCase();
    const phone = clean('phone');
    const digits = phone.replace(/\D/g, '');
    const course = clean('course');
    const experience = clean('experience') || 'beginner';
    const format = clean('format') || 'online';
    const message = clean('message');

    let error = '';
    if (name.length < 2 || name.length > 100 || /[\x00-\x1f]/.test(name))
      error = 'Ad və soyadınızı 2–100 simvol aralığında daxil edin.';
    else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      error = 'Düzgün e-poçt ünvanı daxil edin.';
    else if (
      phone.length > 25 ||
      !/^[+\d() .-]+$/.test(phone) ||
      digits.length < 7 ||
      digits.length > 15
    )
      error = 'Düzgün telefon nömrəsi daxil edin.';
    else if (!courseIds.has(course)) error = 'Maraqlandığınız kursu seçin.';
    else if (!experiences.has(experience) || !formats.has(format))
      error = 'Səviyyə və dərs formatını yoxlayın.';
    else if (message.length > 1500) error = 'Qeydiniz 1500 simvoldan uzun olmamalıdır.';
    else if (body.consent !== true)
      error = 'Müraciətin göndərilməsi üçün məxfilik şərtlərinə razılıq verin.';
    if (error) return res.status(400).json({ error });

    try {
      if (duplicate.get(email, course))
        return res.status(409).json({
          error:
            'Bu e-poçt ilə seçdiyiniz kursa artıq müraciət edilib. Dəyişiklik üçün +994 51 301 95 25 nömrəsi ilə əlaqə saxlayın.',
        });
      const id = `JT-${randomUUID().slice(0, 8).toUpperCase()}`;
      const timestamp = new Date().toISOString();
      insert.run(id, name, email, phone, course, experience, format, message, timestamp, timestamp);
      return res.status(201).json({ reference: id });
    } catch (err) {
      // Never log student data or query parameters.
      console.error('Registration storage failed:', err.code ?? err.name);
      return res
        .status(500)
        .json({ error: 'Müraciət saxlanılmadı. Bir az sonra yenidən cəhd edin.' });
    }
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Bu ünvan mövcud deyil.' }));
  if (production) {
    app.use(express.static(join(projectRoot, 'dist'), { index: false, dotfiles: 'deny' }));
    app.get('/', (_req, res) => res.sendFile(join(projectRoot, 'dist', 'index.html')));
    app.use((_req, res) => res.status(404).type('text').send('Səhifə tapılmadı.'));
  }
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.too.large')
      return res.status(413).json({ error: 'Müraciətin həcmi icazə veriləndən böyükdür.' });
    if (err.type === 'entity.parse.failed')
      return res.status(400).json({ error: 'Sorğu formatı düzgün deyil.' });
    console.error('Request failed:', err.code ?? err.name);
    return res.status(500).json({ error: 'Server xətası. Bir az sonra yenidən cəhd edin.' });
  });
  return {
    app,
    close: () => {
      clearInterval(cleanLimits);
      db.close();
    },
  };
}
