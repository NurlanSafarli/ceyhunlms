import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../server/app.mjs';

let instance, server, base;
const dir = mkdtempSync(join(tmpdir(), 'jayhun-api-'));
const dbPath = join(dir, 'test.sqlite');
const valid = {
  name: 'Test Tələbə',
  email: 'student@example.test',
  phone: '+994 50 123 45 67',
  course: 'help-desk',
  experience: 'beginner',
  format: 'online',
  message: 'Sınaq müraciəti',
  consent: true,
};
const post = (body, url = base) =>
  fetch(`${url}/api/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
before(async () => {
  instance = createApp({ dbPath, rateLimit: 100 });
  server = instance.app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  instance.close();
  rmSync(dir, { recursive: true, force: true });
});

test('health verifies the live database', async () => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('valid registration is persisted with normalized fields and consent', async () => {
  const response = await post({
    ...valid,
    name: '  Test   Tələbə ',
    email: ' Student@Example.Test ',
  });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.match(result.reference, /^JT-[A-F0-9]{8}$/);
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const row = db.prepare('SELECT * FROM registrations WHERE id = ?').get(result.reference);
  db.close();
  assert.equal(row.name, 'Test Tələbə');
  assert.equal(row.email, valid.email);
  assert.equal(row.course, 'help-desk');
  assert.ok(row.consent_at);
  assert.equal(row.message, valid.message);
});
test('duplicate email/course is rejected while a different course is accepted', async () => {
  assert.equal((await post(valid)).status, 409);
  assert.equal((await post({ ...valid, course: 'system-admin' })).status, 201);
});
test('required fields, choices, bounds, consent and honeypot are validated on the server', async () => {
  for (const patch of [
    { name: ' ' },
    { name: 'a'.repeat(101) },
    { name: {} },
    { email: 'invalid' },
    { phone: 'letters' },
    { phone: '123' },
    { course: 'fake' },
    { experience: 'fake' },
    { format: 'fake' },
    { message: 'x'.repeat(1501) },
    { consent: false },
    { consent: 'true' },
    { website: 'spam.example' },
  ]) {
    const response = await post({ ...valid, email: 'validation@example.test', ...patch });
    assert.equal(response.status, 400, JSON.stringify(patch));
    assert.equal(typeof (await response.json()).error, 'string');
  }
  assert.equal((await post(null)).status, 400);
  assert.equal((await post([])).status, 400);
});
test('malformed, unsupported and oversized payloads get controlled errors', async () => {
  let response = await fetch(`${base}/api/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid',
  });
  assert.equal(response.status, 400);
  response = await fetch(`${base}/api/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'hi',
  });
  assert.equal(response.status, 415);
  response = await post({ ...valid, message: 'x'.repeat(13000) });
  assert.equal(response.status, 413);
});
test('student records and database are never exposed by the API', async () => {
  for (const route of ['/api/registrations', '/api/unknown', '/.local/registrations.sqlite'])
    assert.equal((await fetch(base + route)).status, 404);
});
test('rate limiting rejects excessive requests with a retry interval', async () => {
  const limited = createApp({ dbPath: ':memory:', rateLimit: 1 });
  const listener = limited.app.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  try {
    const url = `http://127.0.0.1:${listener.address().port}`;
    assert.equal((await post(valid, url)).status, 201);
    const response = await post({ ...valid, email: 'second@example.test' }, url);
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get('retry-after')) > 0);
  } finally {
    await new Promise((resolve) => listener.close(resolve));
    limited.close();
  }
});
test('registrations survive closing and reopening the SQLite connection', async () => {
  const persistentPath = join(dir, 'restart.sqlite');
  let app = createApp({ dbPath: persistentPath });
  let listener = app.app.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  assert.equal((await post(valid, `http://127.0.0.1:${listener.address().port}`)).status, 201);
  await new Promise((resolve) => listener.close(resolve));
  app.close();
  app = createApp({ dbPath: persistentPath });
  listener = app.app.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  try {
    assert.equal((await post(valid, `http://127.0.0.1:${listener.address().port}`)).status, 409);
  } finally {
    await new Promise((resolve) => listener.close(resolve));
    app.close();
  }
});
