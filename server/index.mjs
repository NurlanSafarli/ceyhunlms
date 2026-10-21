import { createApp } from './app.mjs';

const port = Number(process.env.PORT || 3001);
const { app, close } = createApp({
  dbPath: process.env.DATABASE_PATH || undefined,
  production: process.env.NODE_ENV === 'production',
});
const server = app.listen(port, '0.0.0.0', () =>
  console.log(`Jayhun Tech server listening on port ${port}`),
);
server.on('error', (error) => {
  console.error('Server could not start:', error.code);
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
