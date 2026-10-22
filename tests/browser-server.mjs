// Isolated browser-test server. Never uses the real database or environment credentials.
import { createApp } from '../server/app.mjs';
const { app, close } = createApp({
  dbPath: ':memory:',
  production: true,
  secureCookies: false,
  rateLimit: 100,
  adminCredentials: { username: 'test-admin', password: 'browser-test-only-password' },
});
const server = app.listen(4173, '127.0.0.1');
process.on('SIGTERM', () =>
  server.close(() => {
    close();
    process.exit(0);
  }),
);
