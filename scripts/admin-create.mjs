import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { openDatabase, defaultDbPath } from '../server/database.mjs';
import { createAdmin } from '../server/auth.mjs';

const db = openDatabase(process.env.DATABASE_PATH || defaultDbPath);
let rl;
try {
  let username = process.env.ADMIN_USERNAME || '';
  let password = process.env.ADMIN_PASSWORD || '';
  if (!password) {
    if (!process.stdin.isTTY)
      throw new Error(
        'İnteraktiv terminaldan istifadə edin və ya ADMIN_USERNAME/ADMIN_PASSWORD dəyişənlərini təhlükəsiz mühit ayarlarında təyin edin.',
      );
    let muted = false;
    const output = new Writable({
      write(chunk, _encoding, callback) {
        if (!muted) process.stdout.write(chunk);
        callback();
      },
    });
    rl = createInterface({ input: process.stdin, output, terminal: true });
    username ||= await rl.question('Admin istifadəçi adı: ');
    process.stdout.write('Yeni parol (ən azı 12 simvol, gizli daxiletmə): ');
    muted = true;
    password = await rl.question('');
    muted = false;
    process.stdout.write('\nParolu təkrar daxil edin: ');
    muted = true;
    const repeated = await rl.question('');
    muted = false;
    process.stdout.write('\n');
    if (password !== repeated) throw new Error('Parollar uyğun gəlmir.');
  }
  createAdmin(db, username || 'admin', password, { replace: process.argv.includes('--reset') });
  console.log('Admin hesabı hazırdır. /admin ünvanından daxil olun.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rl?.close();
  db.close();
}
