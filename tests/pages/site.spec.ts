import { test, expect } from '@playwright/test';

test('Pages loads assets and syllabus under its repository subpath', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(response.url());
  });
  await page.goto('./');
  await expect(page).toHaveTitle(/Jayhun Tech/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Sistem inzibatçılığı' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Windows Server və Active Directory');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Sillabusu yüklə/ }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('jayhun-tech-system-admin-sillabus.pdf');
  expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe(
    '/ceyhunlms/favicon.svg?v=jayhun-2',
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test('Pages prepares a WhatsApp draft without pretending to submit or contacting an API', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/') || req.url().includes('wa.me')) apiRequests.push(req.url());
  });
  await page.goto('./#register');
  await page.getByRole('button', { name: 'WhatsApp mesajını hazırla' }).click();
  await expect(page.locator('.whatsapp-ready')).toHaveCount(0);
  await page.getByLabel('Ad və soyad').fill('Sınaq Tələbə');
  await page.getByLabel('Telefon nömrəsi').fill('+994 50 123 45 67');
  await page.getByLabel('E-poçt').fill('test@example.test');
  await page.getByLabel('Maraqlandığınız istiqamət').selectOption('network-admin');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'WhatsApp mesajını hazırla' }).click();
  const link = page.getByRole('link', { name: 'WhatsApp-da aç və göndər' });
  await expect(link).toBeVisible();
  const url = new URL((await link.getAttribute('href'))!);
  expect(url.origin).toBe('https://wa.me');
  expect(url.pathname).toBe('/994513019525');
  expect(url.searchParams.get('text')).toContain('Sınaq Tələbə');
  expect(url.searchParams.get('text')).toContain('Şəbəkə inzibatçılığı');
  expect(url.searchParams.get('text')).toContain('test@example.test');
  await expect(page.locator('.success-panel')).toHaveCount(0);
  await page.getByLabel('Ad və soyad').fill('Dəyişdirilmiş Ad');
  await expect(link).toHaveCount(0);
  expect(apiRequests).toEqual([]);
});

test('Pages privacy and FAQ explain the WhatsApp registration flow', async ({ page }) => {
  await page.goto('./#register');
  await page.locator('.consent button').click();
  await expect(page.getByRole('dialog')).toContainText('WhatsApp xidmətinə ötürülür');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Qeydiyyatdan sonra nə baş verir?' }).click();
  await expect(page.locator('#faq-answer-4')).toContainText('WhatsApp');
});

test('Pages language picker supports repeated touch selections', async ({ page }, info) => {
  await page.goto('./');
  for (const [name, language] of [
    ['English', 'en'],
    ['Русский', 'ru'],
    ['Azərbaycan dili', 'az'],
  ]) {
    const trigger = page.locator('.language-control summary');
    if (info.project.name === 'mobile') await trigger.tap();
    else await trigger.click();
    await trigger.dispatchEvent('focusout', { relatedTarget: null });
    const option = page.getByRole('button', { name, exact: true });
    if (info.project.name === 'mobile') await option.tap();
    else await option.click();
    await expect(page.locator('html')).toHaveAttribute('lang', language);
  }
});
