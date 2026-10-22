// Works in Windows PowerShell/cmd as well as macOS/Linux shells.
process.env.NODE_ENV = 'production';
await import('../server/index.mjs');
