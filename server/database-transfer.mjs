import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, mkdtempSync, chmodSync, linkSync, rmSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';

const requiredTables = [
  'registrations',
  'admin_users',
  'admin_sessions',
  'site_settings',
  'courses',
  'faqs',
  'lesson_groups',
  'group_members',
  'materials',
  'exams',
  'results',
];

export function transferDatabase(source, destination, { restore = false } = {}) {
  if (!source || source === ':memory:' || !existsSync(source))
    throw new Error('Məlumat bazası faylı tapılmadı. DATABASE_PATH ayarını yoxlayın.');
  source = resolve(source);
  destination = resolve(destination);
  if (source === destination || existsSync(destination))
    throw new Error(
      'Hədəf fayl artıq mövcuddur. Üzərinə yazılmadı; yeni yol üçün --to istifadə edin.',
    );
  mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
  const temp = mkdtempSync(join(dirname(destination), '.jayhun-transfer-'));
  chmodSync(temp, 0o700);
  const snapshot = join(temp, 'snapshot.sqlite');
  let db;
  try {
    db = new DatabaseSync(source, { readOnly: true });
    db.exec('PRAGMA busy_timeout=5000');
    const tables = new Set(
      db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all()
        .map((r) => r.name),
    );
    if (!requiredTables.every((name) => tables.has(name)))
      throw new Error('Bu fayl Jayhun Tech məlumat bazası deyil və ya tam deyil.');
    const check = db.prepare('PRAGMA quick_check').all();
    if (check.length !== 1 || Object.values(check[0])[0] !== 'ok')
      throw new Error('Baza yoxlamadan keçmədi. Mənbə dəyişdirilmədi.');
    // SQLite creates one consistent snapshot including committed WAL changes and BLOB files.
    db.prepare('VACUUM INTO ?').run(snapshot);
    db.close();
    db = null;
    chmodSync(snapshot, 0o600);
    if (restore) {
      db = new DatabaseSync(snapshot);
      db.exec('PRAGMA journal_mode=DELETE; DELETE FROM admin_sessions;');
      if (db.prepare('PRAGMA foreign_key_check').all().length)
        throw new Error('Bazada əlaqəli məlumatların bütövlüyü pozulub. Bərpa dayandırıldı.');
      db.close();
      db = null;
    }
    // Publish the finished file atomically; never replace an existing database, even in a race.
    linkSync(snapshot, destination);
    return destination;
  } finally {
    db?.close();
    rmSync(temp, { recursive: true, force: true });
  }
}
