import { test, expect } from '@playwright/test';

test('contact dock remains fixed while scrolling and can be collapsed', async ({ page }, info) => {
  await page.goto('/');
  const dock = page.getByRole('complementary', { name: 'Sürətli əlaqə' });
  if (info.project.name === 'mobile') {
    await expect(dock.getByRole('link')).toHaveCount(0);
    await dock.getByRole('button', { name: 'Əlaqə panelini aç' }).click();
  }
  await expect(dock.getByRole('link', { name: 'WhatsApp (yeni pəncərədə)' })).toHaveAttribute(
    'href',
    'https://wa.me/994513019525',
  );
  await expect(dock.getByRole('link', { name: /Zəng et/ })).toHaveAttribute(
    'href',
    'tel:+994513019525',
  );
  const before = await dock.boundingBox();
  await page.evaluate(() => window.scrollTo(0, 1600));
  await expect(dock).toHaveCSS('position', 'fixed');
  const after = await dock.boundingBox();
  expect(after!.y).toBe(before!.y);
  await dock.getByRole('button', { name: 'Əlaqə panelini bağla' }).click();
  await expect(dock.getByRole('link')).toHaveCount(0);
  await dock.getByRole('button', { name: 'Əlaqə panelini aç' }).click();
  await expect(dock.getByRole('link', { name: /Zəng et/ })).toBeVisible();
});
