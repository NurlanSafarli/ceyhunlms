import { test, expect } from '@playwright/test';

test('contact dock appears at courses, remains available below and hides on return to the top', async ({
  page,
}) => {
  await page.goto('/');
  const dock = page.getByRole('complementary', { name: 'Sürətli əlaqə' });
  await expect(dock).toHaveCount(0);
  await page.locator('#courses').scrollIntoViewIfNeeded();
  await page.evaluate(() =>
    document.getElementById('courses')!.scrollIntoView({ behavior: 'instant' }),
  );
  await expect(dock).toBeVisible();
  await expect(dock.getByRole('link')).toHaveCount(0);
  await expect(dock.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  await dock.getByRole('button', { name: 'Əlaqə panelini aç' }).click();
  await expect(dock.getByRole('link', { name: 'WhatsApp (yeni pəncərədə)' })).toHaveAttribute(
    'href',
    'https://wa.me/994513019525',
  );
  await expect(dock.getByRole('link', { name: /Zəng et/ })).toHaveAttribute(
    'href',
    'tel:+994513019525',
  );
  await expect(dock).toHaveCSS('opacity', '1');
  const before = await dock.boundingBox();
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'instant' }));
  await expect(dock).toHaveCSS('position', 'fixed');
  await expect.poll(async () => (await dock.boundingBox())!.y).toBe(before!.y);
  await dock.getByRole('button', { name: 'Əlaqə panelini bağla' }).click();
  await expect(dock.getByRole('link')).toHaveCount(0);
  await dock.getByRole('button', { name: 'Əlaqə panelini aç' }).click();
  await expect(dock.getByRole('link', { name: /Zəng et/ })).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(dock).toHaveCount(0);
});
