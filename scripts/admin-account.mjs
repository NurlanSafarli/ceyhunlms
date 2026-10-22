import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { createAdmin } from '../server/auth.mjs';

export async function configureAdmin(
  db,
  { username = '', password = '', reset = false, ifMissing = false } = {},
) {
  if (ifMissing && db.prepare('SELECT 1 FROM admin_users LIMIT 1').get()) return false;
  let rl;
  try {
    if (!password) {
      if (!process.stdin.isTTY)
        throw new Error(
          'İlk admin hesabı üçün interaktiv terminalda npm run setup:local işlədin və ya təhlükəsiz mühit ayarlarında ADMIN_USERNAME/ADMIN_PASSWORD təyin edin.',
        );
      let muted = false;
      const output = new Writable({
        write(chunk, _encoding, callback) {
          if (!muted) process.stdout.write(chunk);
          callback();
        },
      });
      rl = createInterface({ input: process.stdin, output, terminal: true });
      username ||=
        (await rl.question('Admin istifadəçi adı (boş saxlasanız admin): ')).trim() || 'admin';
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
    if (
      reset &&
      !db
        .prepare('SELECT 1 FROM admin_users WHERE username=?')
        .get((username || 'admin').trim().toLowerCase())
    )
      throw new Error('Bu admin hesabı tapılmadı. Mövcud istifadəçi adını yoxlayın.');
    createAdmin(db, username || 'admin', password, { replace: reset });
    return true;
  } finally {
    rl?.close();
  }
}
