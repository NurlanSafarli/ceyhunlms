import { test, expect } from '@playwright/test';
import { selectLanguage } from '../language-picker';

test('language and theme changes persist and keep the interface usable', async ({ page }) => {
  await page.goto('/');
  if (await page.locator('.language-control').isVisible()) {
    await expect(page.locator('.language-control summary svg.language-flag')).toBeVisible();
    await page.locator('.language-control summary').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'English', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.language-control summary')).toBeFocused();
  } else {
    await expect(page.locator('.language-native .language-flag')).toBeVisible();
    await expect(page.locator('.language-native select')).toBeVisible();
  }
  await selectLanguage(page, 'en');
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
  await selectLanguage(page, 'ru');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Твой путь');
  await expect(
    page.getByRole('heading', { name: 'Системное администрирование', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Включить светлую тему', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await selectLanguage(page, 'az');
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

test('language selection survives touch blur and repeated mobile taps', async ({ page }, info) => {
  await page.goto('/');
  const trigger = page.locator('.language-control summary');
  async function activate(locator: ReturnType<typeof page.locator>) {
    if (info.project.name === 'mobile') await locator.tap();
    else await locator.click();
  }
  for (const [label, language] of [
    ['English', 'en'],
    ['Русский', 'ru'],
    ['Azərbaycan dili', 'az'],
    ['English', 'en'],
  ]) {
    if (await page.locator('.language-native').isVisible()) {
      await page.locator('.language-native select').selectOption(language);
      await page
        .locator('.language-native select')
        .dispatchEvent('focusout', { relatedTarget: null });
    } else {
      await activate(trigger);
      await trigger.dispatchEvent('focusout', { relatedTarget: null });
      const option = page.getByRole('button', { name: label, exact: true });
      await expect(option).toBeVisible();
      await activate(option);
    }
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.locator('.language-control')).not.toHaveAttribute('open', '');
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  if (await trigger.isVisible()) await activate(trigger);
  await activate(page.locator('h1'));
  await expect(page.getByRole('button', { name: 'Русский', exact: true })).not.toBeVisible();
});
