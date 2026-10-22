import { openDatabase } from '../server/database.mjs';
import { readEnvironment, databasePath } from '../server/config.mjs';
import { configureAdmin } from './admin-account.mjs';

let db;
try {
  const env = readEnvironment();
  db = openDatabase(databasePath(env));
  await configureAdmin(db, {
    username: env.ADMIN_USERNAME,
    password: process.argv.includes('--prompt') ? '' : env.ADMIN_PASSWORD,
    reset: process.argv.includes('--reset'),
  });
  console.log('Admin hesabı hazırdır. /admin ünvanından daxil olun.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db?.close();
}
