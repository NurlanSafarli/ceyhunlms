import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from './app.mjs';
import { runtimeConfig } from './config.mjs';
import { projectRoot, openDatabase } from './database.mjs';

try {
  const local = process.argv.includes('--local');
  const config = runtimeConfig({ local });
  if (config.production && !existsSync(join(projectRoot, 'dist/index.html')))
    throw new Error('Sayt hazırlanmayıb. Əvvəlcə npm run setup:local və ya npm run build işlədin.');
  if (local) {
    if (!existsSync(config.dbPath))
      throw new Error('İlk quraşdırma üçün npm run setup:local işlədin.');
    const db = openDatabase(config.dbPath);
    const admin = db.prepare('SELECT 1 FROM admin_users LIMIT 1').get();
    db.close();
    if (!admin && !config.adminCredentials)
      throw new Error('İlk admin hesabı üçün npm run setup:local işlədin.');
  }
  const { app, close } = createApp(config);
  const server = app.listen(config.port, config.host, () => {
    console.log(`Jayhun Tech server listening on port ${config.port}`);
    if (local) {
      console.log(`Sayt: http://127.0.0.1:${config.port}/`);
      console.log(`Admin panel: http://127.0.0.1:${config.port}/admin`);
      console.log('Yalnız bu kompüterdən açılır. Dayandırmaq üçün Ctrl+C.');
    }
  });
  server.on('error', (error) => {
    console.error(
      error.code === 'EADDRINUSE'
        ? `${config.port} portu artıq istifadə olunur. Əvvəlki prosesi dayandırın və ya .env faylında PORT dəyişin.`
        : `Server could not start: ${error.code}`,
    );
    close();
    process.exit(1);
  });
  function shutdown() {
    server.close(() => {
      close();
      process.exit(0);
    });
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
