import { test, expect } from '@playwright/test';

for (const route of ['admin', 'admin/', 'admin/index.html']) {
  test(`Pages serves ${route} directly and after reload`, async ({ page }) => {
    const failures: string[] = [],
      apiRequests: string[] = [];
    page.on('pageerror', (e) => failures.push(e.message));
    page.on('response', (r) => {
      if (r.status() >= 400) failures.push(r.url());
    });
    page.on('request', (r) => {
      if (r.url().includes('/api/')) apiRequests.push(r.url());
    });
    const response = await page.goto('./' + route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Admin panel.' })).toBeVisible();
    await expect(page).toHaveTitle('Jayhun Tech — Admin panel');
    await page.reload();
    const adminUrl = process.env.VITE_ADMIN_URL;
    if (adminUrl) {
      await expect(page.getByRole('link', { name: 'Panelə daxil ol' })).toHaveAttribute(
        'href',
        adminUrl,
      );
      await expect(page.getByRole('status')).toHaveCount(0);
    } else {
      await expect(page.getByRole('status')).toContainText('Server bağlantısı hələ qurulmayıb');
      await expect(page.getByRole('link', { name: 'Serveri qoşmaq üçün təlimat' })).toBeVisible();
    }
    // Credentials belong on the backend origin; Pages must not collect them.
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Sayta qayıt' })).toHaveAttribute(
      'href',
      '/ceyhunlms/',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    expect(apiRequests).toEqual([]);
    expect(failures).toEqual([]);
    await page.getByRole('link', { name: 'Sayta qayıt' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('IT karyerana');
  });
}

test('Pages static server does not hide a missing route with SPA fallback', async ({ request }) => {
  expect((await request.get('./this-page-does-not-exist')).status()).toBe(404);
});
