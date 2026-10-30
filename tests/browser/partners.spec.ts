import { test, expect } from '@playwright/test';

test('technology strip moves, pauses and respects reduced motion without overflowing', async ({
  page,
}) => {
  await page.goto('/');
  const track = page.locator('.technology-track');
  await expect(track).toHaveCSS('animation-name', 'technology-scroll');
  for (const name of [
    'HPE',
    'TP-Link',
    'Aruba',
    'Omada',
    'PLANET',
    'VPN Tunnel',
    'Pritunl',
    'Hikvision',
    'Windows Server',
    'Dahua',
    'HiWatch',
  ]) {
    await expect(page.locator('.technology-group').first()).toContainText(name);
  }
  await page.getByRole('button', { name: 'Hərəkəti dayandır' }).click();
  await expect(track).toHaveCSS('animation-play-state', 'paused');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(track).toHaveCSS('animation-name', 'none');
});

test('admin adds, reorders, hides and deletes a partner with public results', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel('İstifadəçi adı', { exact: true }).fill('test-admin');
  await page.getByLabel('Parol', { exact: true }).fill('browser-test-only-password');
  await page.getByRole('button', { name: 'Panelə daxil ol' }).click();
  await expect(page.getByRole('heading', { name: 'Hər şey nəzarətinizdə.' })).toBeVisible();
  const menu = page.getByRole('button', { name: 'Menyunu aç' });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole('navigation', { name: 'Admin naviqasiyası' })
    .getByRole('button', { name: 'Sayt məzmunu', exact: true })
    .click();
  const editor = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Partnyorlar və müştərilər' }) });
  await editor.getByRole('button', { name: 'Şirkət əlavə et' }).click();
  await editor.getByLabel('Şirkətin adı', { exact: true }).last().fill('Yeni Test MMC');
  await editor.locator('fieldset').last().getByRole('button', { name: 'Yuxarı' }).click();
  const save = async () => {
    const result = page.waitForResponse(
      (r) => r.url().endsWith('/api/admin/settings') && r.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Məzmunu yadda saxla' }).click();
    expect((await result).status()).toBe(200);
  };
  await save();
  const content = async () =>
    (await (await page.request.get('/api/public/content')).json()).settings.partners;
  expect((await content()).at(-2).name).toBe('Yeni Test MMC');
  const company = editor
    .locator('fieldset')
    .filter({ has: page.locator('input[value="Yeni Test MMC"]') });
  await company.getByLabel('Saytda yayımlansın').uncheck();
  await save();
  expect((await content()).some((p: { name: string }) => p.name === 'Yeni Test MMC')).toBe(false);
  page.once('dialog', (dialog) => dialog.accept());
  await company.getByRole('button', { name: 'Şirkəti sil' }).click();
  await save();
  await page.goto('/');
  await expect(page.locator('#partners')).toContainText('NurCollection MMC');
  await expect(page.locator('#partners')).toContainText('50+');
  await expect(page.locator('#partners')).not.toContainText('Yeni Test MMC');
});
