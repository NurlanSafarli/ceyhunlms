import type { Page } from '@playwright/test';

export async function selectLanguage(page: Page, code: string) {
  const native = page.locator('.language-native select');
  if (await native.isVisible()) {
    await native.selectOption(code);
  } else {
    await page.locator('.language-control summary').click();
    const names: Record<string, string> = { az: 'Azərbaycan dili', en: 'English', ru: 'Русский' };
    await page.getByRole('button', { name: names[code], exact: true }).click();
  }
}
