import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const defaultDbPath = join(projectRoot, '.local', 'registrations.sqlite');
export const defaults = JSON.parse(
  readFileSync(join(projectRoot, 'shared/default-content.json'), 'utf8'),
);

const legacySolutions = JSON.parse(
  readFileSync(join(projectRoot, 'server/legacy-solutions.json'), 'utf8'),
);

export function openDatabase(dbPath = defaultDbPath) {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(dbPath);
  if (dbPath !== ':memory:') chmodSync(dbPath, 0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
      course TEXT NOT NULL, experience TEXT NOT NULL, format TEXT NOT NULL, message TEXT NOT NULL DEFAULT '',
      consent_at TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(email, course)
    );
    CREATE TABLE IF NOT EXISTS admin_users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE, csrf_token TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS public_images (id TEXT PRIMARY KEY, data BLOB NOT NULL, version TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS site_settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS courses (id TEXT PRIMARY KEY, data TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS faqs (id TEXT PRIMARY KEY, question TEXT NOT NULL, answer TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS lesson_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, course_id TEXT NOT NULL REFERENCES courses(id), start_date TEXT NOT NULL DEFAULT '', end_date TEXT NOT NULL DEFAULT '', schedule TEXT NOT NULL DEFAULT '', format TEXT NOT NULL, capacity INTEGER NOT NULL, status TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS group_members (group_id TEXT NOT NULL REFERENCES lesson_groups(id) ON DELETE CASCADE, registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE, joined_at TEXT NOT NULL, PRIMARY KEY(group_id,registration_id));
    CREATE TABLE IF NOT EXISTS materials (id TEXT PRIMARY KEY, title TEXT NOT NULL, group_id TEXT REFERENCES lesson_groups(id), type TEXT NOT NULL, url TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', file_name TEXT, file_size INTEGER, file_blob BLOB, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS exams (id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES lesson_groups(id), title TEXT NOT NULL, scheduled_at TEXT NOT NULL, duration INTEGER NOT NULL, max_score REAL NOT NULL, pass_score REAL NOT NULL, location TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS results (id TEXT PRIMARY KEY, exam_id TEXT NOT NULL REFERENCES exams(id), registration_id TEXT NOT NULL REFERENCES registrations(id), score REAL, status TEXT NOT NULL, feedback TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, UNIQUE(exam_id,registration_id));
    CREATE INDEX IF NOT EXISTS registrations_created ON registrations(created_at);
    CREATE INDEX IF NOT EXISTS group_members_student ON group_members(registration_id);
    CREATE INDEX IF NOT EXISTS exams_scheduled ON exams(scheduled_at);
  `);
  const columns = new Set(
    db
      .prepare('PRAGMA table_info(registrations)')
      .all()
      .map((c) => c.name),
  );
  for (const [name, definition] of Object.entries({
    status: "TEXT NOT NULL DEFAULT 'new'",
    admin_note: "TEXT NOT NULL DEFAULT ''",
    source: "TEXT NOT NULL DEFAULT 'website'",
    updated_at: "TEXT NOT NULL DEFAULT ''",
  })) {
    if (!columns.has(name)) db.exec(`ALTER TABLE registrations ADD COLUMN ${name} ${definition}`);
  }
  // Seed once, never resurrect content the administrator intentionally deleted.
  if (!db.prepare('SELECT 1 FROM site_settings WHERE id=1').get()) {
    db.exec('BEGIN');
    try {
      db.prepare('INSERT INTO site_settings VALUES (1,?)').run(JSON.stringify(defaults.settings));
      const insertCourse = db.prepare('INSERT INTO courses VALUES (?,?,?,?,?)');
      for (const c of defaults.courses)
        insertCourse.run(c.id, JSON.stringify(c), 1, c.sort_order, new Date().toISOString());
      const insertFaq = db.prepare('INSERT INTO faqs VALUES (?,?,?,?,?)');
      for (const f of defaults.faqs) insertFaq.run(f.id, f.question, f.answer, 1, f.sort_order);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      db.close();
      throw error;
    }
  }
  // Upgrade only the untouched original template; preserve all administrator edits/deletions.
  const stored = JSON.parse(db.prepare('SELECT data FROM site_settings WHERE id=1').get().data);
  if (
    Array.isArray(stored.solutions) &&
    stored.solutions.length === legacySolutions.length &&
    stored.solutions.every((item, i) =>
      Object.entries(legacySolutions[i]).every(
        ([key, value]) => item[key] === value || (key === 'visual' && item[key] === undefined),
      ),
    )
  ) {
    stored.solutions = defaults.settings.solutions;
    db.prepare('UPDATE site_settings SET data=? WHERE id=1').run(JSON.stringify(stored));
  }
  return db;
}

export function readContent(db, publishedOnly = true) {
  const settings = {
    ...defaults.settings,
    ...JSON.parse(db.prepare('SELECT data FROM site_settings WHERE id=1').get().data),
  };
  settings.instructorPhotos = db
    .prepare('SELECT id,version FROM public_images ORDER BY rowid')
    .all()
    .map((photo) => ({
      id: photo.id,
      url:
        photo.id === 'instructor'
          ? `/api/public/instructor-photo?v=${photo.version}`
          : `/api/public/instructor-photos/${photo.id}?v=${photo.version}`,
    }));
  settings.instructorPhotoUrl = settings.instructorPhotos[0]?.url || '';
  if (publishedOnly) settings.solutions = settings.solutions.filter((item) => item.published);
  const where = publishedOnly ? ' WHERE published=1' : '';
  const courses = db
    .prepare(`SELECT * FROM courses${where} ORDER BY sort_order,id`)
    .all()
    .map((c) => ({
      ...JSON.parse(c.data),
      id: c.id,
      published: !!c.published,
      sort_order: c.sort_order,
    }));
  const faqs = db
    .prepare(`SELECT * FROM faqs${where} ORDER BY sort_order,id`)
    .all()
    .map((f) => ({ ...f, published: !!f.published }));
  return { settings, courses, faqs };
}
