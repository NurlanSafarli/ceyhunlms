import { randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import { projectRoot } from '../server/database.mjs';
import { databasePath } from '../server/config.mjs';
import { transferDatabase } from '../server/database-transfer.mjs';

try {
  const [command, ...args] = process.argv.slice(2);
  let input, target;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--to' && args[i + 1] && !target) target = args[++i];
    else if (!args[i].startsWith('-') && !input) input = args[i];
    else
      throw new Error(
        'İstifadə: npm run db:backup -- [--to yeni.sqlite] və ya npm run db:restore -- ehtiyat.sqlite [--to yeni.sqlite]',
      );
  }
  if (command === 'backup' && !input) {
    const name = `jayhun-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}.sqlite`;
    const destination = target
      ? resolve(projectRoot, target)
      : join(projectRoot, '.local/backups', name);
    console.log('Ehtiyat nüsxə hazırdır:', transferDatabase(databasePath(), destination));
    console.log('Faylı məxfi saxlayın. Burada tələbələr, fayllar, məzmun və admin hesabları var.');
  } else if (command === 'restore' && input) {
    const destination = target ? resolve(projectRoot, target) : databasePath();
    if (destination === ':memory:') throw new Error('Bərpa üçün qalıcı fayl yolu seçin.');
    console.log(
      'Baza bərpa edildi:',
      transferDatabase(resolve(projectRoot, input), destination, { restore: true }),
    );
    console.log(
      'Admin parolu saxlanıldı; əvvəlki sessiyalar ləğv edildi. Yeni hədəf seçmisinizsə, .env faylında DATABASE_PATH dəyərini həmin yola dəyişin.',
    );
  } else
    throw new Error(
      'İstifadə: npm run db:backup və ya npm run db:restore -- ehtiyat.sqlite [--to yeni.sqlite]',
    );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
