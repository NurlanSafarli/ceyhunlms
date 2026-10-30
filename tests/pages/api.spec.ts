import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const defaults = JSON.parse(
  readFileSync(new URL('../../shared/default-content.json', import.meta.url), 'utf8'),
);
const origin = process.env.VITE_API_ORIGIN;
test.skip(!origin, 'Only for the PHP-connected Pages build');
test('Pages reads PHP content and submits registration to the PHP origin', async ({ page }) => {
  const content = structuredClone(defaults);
  content.settings.partners[0].name = 'PHP-dən gələn şirkət';
  content.settings.logoUrl = '/api/public/logo?v=1';
  await page.route(`${origin}/api/public/content`, (route) =>
    route.fulfill({ json: content, headers: { 'access-control-allow-origin': '*' } }),
  );
  await page.route(`${origin}/api/public/logo?*`, (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>',
    }),
  );
  await page.route(`${origin}/api/registrations`, async (route) => {
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST',
          'access-control-allow-headers': 'Content-Type',
        },
      });
    expect(route.request().postDataJSON().name).toBe('PHP Test');
    await route.fulfill({
      status: 201,
      json: { reference: 'PHP-123' },
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto('./#register');
  await expect(page.locator('#partners')).toContainText('PHP-dən gələn şirkət');
  await expect(page.locator(`img[src="${origin}/api/public/logo?v=1"]`).first()).toBeAttached();
  await page.getByLabel('Ad və soyad').fill('PHP Test');
  await page.getByLabel('Telefon nömrəsi').fill('+994501234567');
  await page.getByLabel('E-poçt').fill('php-test@example.test');
  await page.getByLabel('Maraqlandığınız istiqamət').selectOption('network-admin');
  await page.getByRole('checkbox').check();
  await page.locator('#register button[type="submit"]').click();
  await expect(page.locator('.success-panel')).toBeVisible();
});
