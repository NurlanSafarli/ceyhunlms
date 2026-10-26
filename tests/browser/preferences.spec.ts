import { test, expect } from '@playwright/test';

test('language and theme changes persist and keep the interface usable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.language-control summary svg.language-flag')).toBeVisible();
  await page.locator('.language-control summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'English', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.language-control summary')).toBeFocused();
  await expect(page.getByRole('button', { name: 'English', exact: true })).not.toBeVisible();
  await page.locator('.language-control summary').click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your journey');
  await expect(
    page.getByRole('heading', { name: 'IT solutions for your business', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.language-control summary').click();
  await page.getByRole('button', { name: 'Русский', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Твой путь');
  await expect(
    page.getByRole('heading', { name: 'Системное администрирование', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Включить светлую тему', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('.language-control summary').click();
  await page.getByRole('button', { name: 'Azərbaycan dili', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('IT karyerana');
  await expect(page.locator('.about-signature')).toHaveCount(0);
  await expect(page.getByText('BEHIND THE SCREENS', { exact: true })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.solution-main-icon')
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
});
