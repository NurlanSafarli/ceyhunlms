import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { once } from 'node:events';
import { createApp } from '../server/app.mjs';
import { openDatabase } from '../server/database.mjs';
import { readEnvironment, databasePath, runtimeConfig } from '../server/config.mjs';
import { transferDatabase } from '../server/database-transfer.mjs';
import { configureAdmin } from '../scripts/admin-account.mjs';
import { verifyPassword } from '../server/auth.mjs';

test('.env settings are shared by commands while hosting variables take precedence', () => {
  const root = mkdtempSync(join(tmpdir(), 'jayhun-config-'));
  try {
    writeFileSync(
      join(root, '.env'),
      'PORT=3100\nDATABASE_PATH="data/my class.sqlite"\nADMIN_USERNAME=teacher\n',
    );
    const env = readEnvironment({ root, env: { PORT: '3200', NODE_ENV: 'production' } });
    assert.equal(env.PORT, '3200');
    assert.equal(env.ADMIN_USERNAME, 'teacher');
    assert.equal(databasePath(env, root), join(root, 'data/my class.sqlite'));
    assert.equal(databasePath({ DATABASE_PATH: ':memory:' }), ':memory:');
    assert.equal(runtimeConfig({ env }).secureCookies, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('local mode serves the built site on loopback with HTTP login, independent of production variables', () => {
  const config = runtimeConfig({
    local: true,
    env: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: '3005',
      COOKIE_SECURE: 'true',
      TRUST_PROXY_HOPS: '1',
    },
  });
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 3005);
  assert.equal(config.production, true);
  assert.equal(config.secureCookies, false);
  assert.equal(config.trustProxy, false);
});

test('public production rejects insecure cookies and invalid settings; proxy trust is explicit', () => {
  const config = runtimeConfig({ env: { NODE_ENV: 'production', TRUST_PROXY_HOPS: '1' } });
  assert.equal(config.secureCookies, true);
  assert.equal(config.trustProxy, 1);
  assert.equal(runtimeConfig({ env: {} }).trustProxy, false);
  for (const env of [
    { PORT: 'no' },
    { PORT: '0' },
    { PORT: '65536' },
    { TRUST_PROXY_HOPS: 'true' },
    { COOKIE_SECURE: 'no' },
    { NODE_ENV: 'production', COOKIE_SECURE: 'false' },
  ])
    assert.throws(() => runtimeConfig({ env }));
});

test('re-running initial admin setup preserves the existing account and password', async () => {
  const db = openDatabase(':memory:');
  const password = randomBytes(24).toString('hex');
  try {
    assert.equal(
      await configureAdmin(db, { username: 'teacher', password, ifMissing: true }),
      true,
    );
    assert.equal(
      await configureAdmin(db, {
        username: 'replacement',
        password: randomBytes(24).toString('hex'),
        ifMissing: true,
      }),
      false,
    );
    const admins = db.prepare('SELECT * FROM admin_users').all();
    assert.equal(admins.length, 1);
    assert.equal(admins[0].username, 'teacher');
    assert.ok(verifyPassword(password, admins[0].password_hash));
  } finally {
    db.close();
  }
});

test('forwarded client IPs affect rate limits only behind the explicitly trusted proxy', async () => {
  for (const trustProxy of [false, 1]) {
    const instance = createApp({ dbPath: ':memory:', rateLimit: 1, trustProxy });
    const server = instance.app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const send = (ip) =>
        fetch(`http://127.0.0.1:${server.address().port}/api/registrations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
          body: '{}',
        });
      assert.equal((await send('192.0.2.1')).status, 400);
      assert.equal((await send('192.0.2.2')).status, trustProxy ? 400 : 429);
      assert.equal((await send('192.0.2.1')).status, 429);
    } finally {
      await new Promise((r) => server.close(r));
      instance.close();
    }
  }
});

test('online backup includes WAL writes, students, files and results; restore preserves accounts and revokes sessions', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'jayhun-transfer-'));
  const source = join(dir, 'source.sqlite'),
    backup = join(dir, 'backup.sqlite'),
    restored = join(dir, 'restored.sqlite');
  const db = openDatabase(source);
  let restoredDb, snapshotDb;
  try {
    const password = randomBytes(24).toString('hex');
    await configureAdmin(db, { username: 'teacher', password });
    const id = db.prepare('SELECT id FROM admin_users').get().id;
    db.prepare('INSERT INTO admin_sessions VALUES (?,?,?,?)').run(
      'session-hash',
      id,
      'csrf',
      Date.now() + 100000,
    );
    db.exec(`
      INSERT INTO registrations (id,name,email,phone,course,experience,format,message,consent_at,created_at) VALUES ('student','Sınaq','test@example.test','+994501234567','help-desk','beginner','online','','','2026-10-01');
      INSERT INTO lesson_groups (id,name,course_id,format,capacity,status,created_at) VALUES ('group','Lokal qrup','help-desk','online',10,'active','2026-10-01');
      INSERT INTO group_members VALUES ('group','student','2026-10-01');
      INSERT INTO exams (id,group_id,title,scheduled_at,duration,max_score,pass_score,status,created_at) VALUES ('exam','group','Yekun','2026-12-01T15:00:00Z',60,100,60,'scheduled','2026-10-01');
      INSERT INTO results (id,exam_id,registration_id,score,status,created_at) VALUES ('result','exam','student',85,'graded','2026-10-01');
      DELETE FROM faqs WHERE id='faq-1';
      UPDATE site_settings SET data=json_set(data,'$.heroLine1','Lokal məzmun');
    `);
    const contents = Buffer.from('Dərs vəsaiti, saxlanmalı fayl');
    db.prepare(
      'INSERT INTO materials (id,title,group_id,type,file_name,file_size,file_blob,created_at) VALUES (?,?,?,?,?,?,?,?)',
    ).run(
      'material',
      'Dərs',
      'group',
      'document',
      'lesson.txt',
      contents.length,
      contents,
      '2026-10-01',
    );
    assert.ok(existsSync(source + '-wal'));
    transferDatabase(source, backup);
    snapshotDb = new DatabaseSync(backup, { readOnly: true });
    assert.equal(snapshotDb.prepare('SELECT COUNT(*) n FROM admin_sessions').get().n, 1);
    transferDatabase(backup, restored, { restore: true });
    restoredDb = openDatabase(restored);
    for (const table of [
      'registrations',
      'admin_users',
      'site_settings',
      'courses',
      'faqs',
      'lesson_groups',
      'group_members',
      'materials',
      'exams',
      'results',
    ])
      assert.deepEqual(
        restoredDb.prepare(`SELECT * FROM ${table}`).all(),
        db.prepare(`SELECT * FROM ${table}`).all(),
        table,
      );
    assert.equal(restoredDb.prepare('SELECT COUNT(*) n FROM admin_sessions').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM admin_sessions').get().n, 1);
    assert.ok(
      verifyPassword(
        password,
        restoredDb.prepare('SELECT password_hash FROM admin_users').get().password_hash,
      ),
    );
    assert.equal(
      Buffer.from(restoredDb.prepare('SELECT file_blob FROM materials').get().file_blob).toString(),
      contents.toString(),
    );
    assert.throws(() => transferDatabase(backup, restored, { restore: true }), /artıq mövcuddur/);
    assert.throws(() => transferDatabase(source, source), /artıq mövcuddur/);
  } finally {
    restoredDb?.close();
    snapshotDb?.close();
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('invalid backups never create or overwrite a destination', () => {
  const dir = mkdtempSync(join(tmpdir(), 'jayhun-invalid-'));
  try {
    const source = join(dir, 'invalid.sqlite'),
      target = join(dir, 'target.sqlite');
    writeFileSync(source, 'not a database');
    assert.throws(() => transferDatabase(source, target, { restore: true }));
    assert.equal(existsSync(target), false);
    writeFileSync(target, 'existing data');
    assert.throws(() => transferDatabase(source, target, { restore: true }));
    assert.equal(readFileSync(target, 'utf8'), 'existing data');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
