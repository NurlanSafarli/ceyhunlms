import { defineConfig } from '@playwright/test';
import config from './playwright.config';

export default defineConfig({
  ...config,
  testDir: './tests/pages',
  use: { ...config.use, baseURL: 'http://127.0.0.1:4174/ceyhunlms/' },
  webServer: {
    command: 'npx --no-install vite preview --mode pages --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/ceyhunlms/',
    reuseExistingServer: false,
    timeout: 15000,
  },
});
