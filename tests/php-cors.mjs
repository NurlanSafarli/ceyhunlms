import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './php-app.mjs';
const dir = mkdtempSync(join(tmpdir(), 'php-cors-'));
let instance, server, base;
const origin = 'https://nurlansafarli.github.io';
before(async () => {
  instance = createApp({ dbPath: join(dir, 'test.sqlite') });
  server = instance.app.listen(0);
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  instance?.close();
  rmSync(dir, { recursive: true, force: true });
});
test('Pages can read public content, but unrelated origins and admin endpoints get no CORS access', async () => {
  const response = await fetch(base + '/api/public/content', { headers: { Origin: origin } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.equal(response.headers.get('access-control-allow-credentials'), null);
  assert.ok((await response.json()).settings.partners.length);
  for (const [path, requestOrigin] of [
    ['/api/public/content', 'https://example.com'],
    ['/api/admin/settings', origin],
    ['/api/admin/login', origin],
  ]) {
    const r = await fetch(base + path, { headers: { Origin: requestOrigin } });
    assert.equal(r.headers.get('access-control-allow-origin'), null);
  }
});
test('registration preflight permits JSON POST without credentials and preserves validation', async () => {
  const headers = {
    Origin: origin,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type',
  };
  const response = await fetch(base + '/api/registrations', { method: 'OPTIONS', headers });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-methods'), 'POST');
  assert.equal(response.headers.get('access-control-allow-headers'), 'Content-Type');
  const invalid = await fetch(base + '/api/registrations', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.headers.get('access-control-allow-origin'), origin);
  const denied = await fetch(base + '/api/registrations', {
    method: 'OPTIONS',
    headers: { ...headers, 'Access-Control-Request-Method': 'DELETE' },
  });
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});
