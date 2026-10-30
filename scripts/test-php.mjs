// Runs the HTTP API/admin tests against the PHP backend (php/) instead of the Node server.
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'tests', '.php');
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const name of ['api', 'admin']) {
  const source = readFileSync(join(root, 'tests', `${name}.test.mjs`), 'utf8')
    .replace("'../server/app.mjs'", "'../php-app.mjs'")
    .replaceAll("'../server/", "'../../server/")
    .replaceAll("'../scripts/", "'../../scripts/")
    .replaceAll("new URL('../", "new URL('../../")
    // PHP stores bcrypt hashes instead of Node scrypt hashes.
    .replace(
      'assert.ok(verifyPassword(password, user.password_hash));',
      'assert.match(user.password_hash, /^\\$2y\\$12\\$/);',
    );
  writeFileSync(join(out, `${name}.test.mjs`), source);
}
const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-concurrency=1',
    join(out, 'api.test.mjs'),
    join(out, 'admin.test.mjs'),
    join(root, 'tests', 'php-cors.mjs'),
  ],
  {
    stdio: 'inherit',
  },
);
rmSync(out, { recursive: true, force: true });
process.exit(result.status ?? 1);
