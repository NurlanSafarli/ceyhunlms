import { defineConfig } from '@playwright/test';
import config from './playwright.config';

export default defineConfig({
  ...config,
  testDir: './tests/pages',
  use: { ...config.use, baseURL: 'http://127.0.0.1:4174/ceyhunlms/' },
  webServer: {
    command: 'node tests/pages-server.mjs',
    url: 'http://127.0.0.1:4174/ceyhunlms/',
    reuseExistingServer: false,
    timeout: 15000,
  },
});
