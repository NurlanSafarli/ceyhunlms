import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const serverEnv = loadEnv(mode, process.cwd(), '');
  const adminUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_ADMIN_URL?.trim() || '';
  const apiOrigin = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_ORIGIN?.trim() || '';
  if (apiOrigin) {
    const url = new URL(apiOrigin);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      throw new Error('VITE_API_ORIGIN must be an HTTPS origin without a path or credentials.');
  }
  if (mode === 'pages' && adminUrl) {
    const url = new URL(adminUrl);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.hostname === 'nurlansafarli.github.io'
    ) {
      throw new Error(
        'VITE_ADMIN_URL must be the HTTPS admin URL of your backend, without credentials, query or fragment.',
      );
    }
  }
  return {
    base: mode === 'pages' ? '/ceyhunlms/' : '/',
    build: { outDir: mode === 'pages' ? 'dist-pages' : 'dist' },
    plugins: [react()],
    server: { proxy: { '/api': `http://127.0.0.1:${serverEnv.PORT || 3001}` } },
    define: {
      'import.meta.env.VITE_ADMIN_URL': JSON.stringify(adminUrl),
      'import.meta.env.VITE_API_ORIGIN': JSON.stringify(apiOrigin.replace(/\/$/, '')),
    },
  };
});
