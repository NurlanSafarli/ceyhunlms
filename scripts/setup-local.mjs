import { copyFileSync, chmodSync, constants } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { openDatabase, projectRoot } from '../server/database.mjs';
import { readEnvironment, runtimeConfig } from '../server/config.mjs';
import { configureAdmin } from './admin-account.mjs';

let db;
try {
  // Keep existing settings. Passwords are never written to this file by setup.
  try {
    copyFileSync(
      join(projectRoot, '.env.example'),
      join(projectRoot, '.env'),
      constants.COPYFILE_EXCL,
    );
    chmodSync(join(projectRoot, '.env'), 0o600);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  const env = readEnvironment();
  const config = runtimeConfig({ env, local: true });
  if (config.dbPath === ':memory:')
    throw new Error('Lokal istifadə üçün DATABASE_PATH qalıcı fayla işarə etməlidir.');
  console.log('Sayt hazırlanır…');
  for (const [script, args] of [
    ['node_modules/typescript/bin/tsc', ['-b']],
    ['node_modules/vite/bin/vite.js', ['build']],
  ]) {
    const result = spawnSync(process.execPath, [join(projectRoot, script), ...args], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    if (result.error || result.status !== 0)
      throw new Error('Hazırlama tamamlanmadı. Node.js 24 və npm ci quraşdırmasını yoxlayın.');
  }
  db = openDatabase(config.dbPath);
  const created = await configureAdmin(db, {
    username: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD,
    ifMissing: true,
  });
  console.log(
    created ? 'İlk admin hesabı yaradıldı.' : 'Mövcud admin hesabı və məlumatlar saxlanıldı.',
  );
  console.log('Hazırdır. Başlatmaq üçün: npm run local');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db?.close();
}
