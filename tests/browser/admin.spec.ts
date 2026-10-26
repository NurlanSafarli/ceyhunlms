import sharp from 'sharp';
import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/admin');
  await page.getByLabel('İstifadəçi adı', { exact: true }).fill('test-admin');
  await page.getByLabel('Parol', { exact: true }).fill('browser-test-only-password');
  await page.getByRole('button', { name: 'Panelə daxil ol' }).click();
  await expect(page.getByRole('heading', { name: 'Hər şey nəzarətinizdə.' })).toBeVisible();
}
async function nav(page: Page, label: string) {
  const menu = page.getByRole('button', { name: 'Menyunu aç' });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole('navigation', { name: 'Admin naviqasiyası' })
    .getByRole('button', { name: label, exact: true })
    .click();
}
async function save(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Yadda saxla', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('admin login, session persistence and logout protect the panel', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel('İstifadəçi adı', { exact: true }).fill('test-admin');
  await page.getByLabel('Parol', { exact: true }).fill('incorrect');
  await page.getByRole('button', { name: 'Panelə daxil ol' }).click();
  await expect(page.getByRole('alert')).toContainText('düzgün deyil');
  await page.getByLabel('Parol', { exact: true }).fill('browser-test-only-password');
  await page.getByRole('button', { name: 'Panelə daxil ol' }).click();
  await expect(page.getByRole('heading', { name: 'Hər şey nəzarətinizdə.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hər şey nəzarətinizdə.' })).toBeVisible();
  const menu = page.getByRole('button', { name: 'Menyunu aç' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name: 'Hesabdan çıx' }).click();
  await expect(page.getByRole('button', { name: 'Panelə daxil ol' })).toBeVisible();
  expect((await page.request.get('/api/admin/registrations')).status()).toBe(401);
});

test('teacher can manage a student, group, file, exam and result end to end', async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  const prefix = info.project.name;
  const name = `Panel Tələbə ${prefix}`,
    group = `Praktika ${prefix}`,
    exam = `Yekun ${prefix}`;
  await login(page);
  await nav(page, 'Müraciətlər');
  await page.getByRole('button', { name: 'Tələbə əlavə et', exact: true }).click();
  await page.getByLabel('Ad və soyad', { exact: false }).fill(name);
  await page.getByLabel('E-poçt', { exact: false }).fill(`panel-${prefix}@example.test`);
  await page.getByLabel('Telefon', { exact: false }).fill('+994501234567');
  await page.getByLabel('Kurs', { exact: false }).selectOption('help-desk');
  await save(page);
  await expect(page.locator('tbody')).toContainText(name);
  await nav(page, 'Dərs qrupları');
  await page.getByRole('button', { name: 'Qrup əlavə et', exact: true }).click();
  await page.getByLabel('Qrupun adı', { exact: false }).fill(group);
  await page.getByLabel('Kurs', { exact: false }).selectOption('help-desk');
  await page.getByLabel('Status', { exact: true }).selectOption('active');
  await save(page);
  await page.getByRole('button', { name: `${group} tələbələri`, exact: true }).click();
  await page
    .getByLabel('Qrupa tələbə əlavə et', { exact: true })
    .selectOption({ label: `${name} · panel-${prefix}@example.test` });
  await page.getByRole('dialog').getByRole('button', { name: 'Əlavə et', exact: true }).click();
  await expect(page.locator('.ad-member-list')).toContainText(name);
  await page.getByRole('button', { name: 'Pəncərəni bağla', exact: true }).click();
  await nav(page, 'Tədris vəsaitləri');
  await page.getByRole('button', { name: 'Vəsait əlavə et', exact: true }).click();
  await page.getByLabel('Vəsaitin adı', { exact: false }).fill(`Dərs faylı ${prefix}`);
  await page.getByLabel('Qrup', { exact: true }).selectOption({ label: group });
  await page.getByLabel('Fayl əlavə et və ya dəyiş', { exact: false }).setInputFiles({
    name: 'lesson.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('IT dərs qeydləri'),
  });
  await save(page);
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('row')
    .filter({ hasText: `Dərs faylı ${prefix}` })
    .getByRole('link', { name: 'lesson.txt', exact: true })
    .click();
  expect((await downloadPromise).suggestedFilename()).toBe('lesson.txt');
  await nav(page, 'İmtahan təqvimi');
  await page.getByRole('button', { name: 'İmtahan əlavə et', exact: true }).click();
  await page.getByLabel('İmtahanın adı', { exact: false }).fill(exam);
  await page.getByLabel('Qrup', { exact: false }).selectOption({ label: group });
  await page.getByLabel('Tarix və saat', { exact: false }).fill('2026-12-12T19:00');
  await save(page);
  await expect(page.locator('tbody')).toContainText('19:00');
  await nav(page, 'Nəticələr');
  await page.getByRole('button', { name: 'Nəticə əlavə et', exact: true }).click();
  await page.getByLabel('İmtahan', { exact: false }).selectOption({ label: `${exam} · ${group}` });
  await expect(page.getByLabel('Tələbə', { exact: false })).toContainText(name);
  await page.getByLabel('Tələbə', { exact: false }).selectOption({ label: name });
  await page.getByLabel('Toplanan bal', { exact: true }).fill('85');
  await save(page);
  const row = page.locator('tbody tr').filter({ hasText: name });
  await expect(row).toContainText('85');
  await expect(row).toContainText('Keçib');
  await row.getByRole('button', { name: `${name} redaktə et`, exact: true }).click();
  await page.getByLabel('Toplanan bal', { exact: true }).fill('35');
  await save(page);
  await expect(row).toContainText('Keçməyib');
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: `${name} sil`, exact: true }).click();
  await expect(row).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});

test('CMS changes appear publicly and new courses support editable modules', async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  await login(page);
  await nav(page, 'Sayt məzmunu');
  const heading = `Admin məzmunu ${info.project.name}`;
  await page.getByLabel('Başlıq — 1-ci sətir', { exact: true }).fill(heading);
  await page.getByLabel('WhatsApp linki', { exact: true }).fill('https://wa.me/994513019525');
  await page
    .getByLabel('LinkedIn linki', { exact: true })
    .fill('https://www.linkedin.com/in/example-teacher');
  await page
    .getByLabel('Instagram linki', { exact: true })
    .fill('https://www.instagram.com/example-teacher/');
  await page.getByRole('button', { name: 'Məzmunu yadda saxla' }).click();
  await expect(page.getByRole('status')).toContainText('Sayt məzmunu yeniləndi');
  const publicPage = await page.context().newPage();
  await publicPage.goto('/');
  await expect(publicPage.getByRole('heading', { level: 1 })).toContainText(heading);

  for (const [name, href] of [
    ['WhatsApp', 'https://wa.me/994513019525'],
    ['LinkedIn', 'https://www.linkedin.com/in/example-teacher'],
    ['Instagram', 'https://www.instagram.com/example-teacher/'],
  ]) {
    const link = publicPage
      .locator('footer')
      .getByRole('link', { name: `${name} (yeni pəncərədə)`, exact: true });
    await expect(link).toHaveAttribute('href', href);
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  await publicPage.close();
  await page.getByLabel('Başlıq — 1-ci sətir', { exact: true }).fill('IT karyerana');
  await page.getByLabel('LinkedIn linki', { exact: true }).fill('');
  await page.getByLabel('Instagram linki', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Məzmunu yadda saxla' }).click();
  await expect(page.getByRole('status')).toContainText('Sayt məzmunu yeniləndi');
  const clearedPage = await page.context().newPage();
  await clearedPage.goto('/');
  await expect(
    clearedPage.getByRole('link', { name: 'Instagram (yeni pəncərədə)', exact: true }),
  ).toHaveCount(0);
  await expect(
    clearedPage.getByRole('link', { name: 'LinkedIn (yeni pəncərədə)', exact: true }),
  ).toHaveCount(0);
  await clearedPage.close();
  await nav(page, 'Kurslar və sillabus');
  await page.getByRole('button', { name: 'Kurs əlavə et', exact: true }).click();
  const title = `Linux laboratoriyası ${info.project.name}`;
  await page.getByLabel('Kursun adı', { exact: false }).fill(title);
  await page.getByLabel('Kurs kodu', { exact: false }).fill(`linux-${info.project.name}`);
  await page.getByLabel('Müddət', { exact: false }).fill('6 həftə');
  await page.getByRole('button', { name: 'Modul əlavə et' }).click();
  await page.getByLabel('Modulun adı', { exact: false }).fill('Terminala giriş');
  await page.getByLabel('Mövzular', { exact: false }).fill('Fayllar\nİcazələr');
  await save(page);
  const row = page.locator('tbody tr').filter({ hasText: title });
  await expect(row).toContainText('1 modul');
  const preview = await page.context().newPage();
  await preview.goto('/');
  await expect(preview.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await preview.close();
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: `${title} sil`, exact: true }).click();
  await expect(row).toHaveCount(0);
});

test('teacher photo and IT solution settings publish and can be removed', async ({
  page,
}, info) => {
  await login(page);
  await nav(page, 'Sayt məzmunu');
  const image = await sharp({
    create: { width: 80, height: 100, channels: 3, background: '#e0ecff' },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel('Şəkillər əlavə et', { exact: true })
    .setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: image });
  await expect(page.getByRole('status')).toContainText('Şəkil yükləndi');
  await page.getByRole('button', { name: 'IT həlli əlavə et', exact: true }).click();
  const fieldset = page.locator('.ad-solutions-editor fieldset').last();
  const title = `Bulud həlli ${info.project.name}`;
  await fieldset.getByLabel('Xidmətin adı', { exact: true }).fill(title);
  await fieldset
    .getByLabel('Xidmətin təsviri', { exact: true })
    .fill('Bulud sistemlərinin sazlanması.');
  await fieldset.getByLabel('Animasiya növü', { exact: true }).selectOption('cloud');
  await page.getByRole('button', { name: 'Məzmunu yadda saxla' }).click();
  await expect(page.locator('.ad-toast')).toContainText('Sayt məzmunu yeniləndi');
  const publicPage = await page.context().newPage();
  await publicPage.goto('/');
  await expect(
    publicPage.locator('#solutions').getByRole('heading', { name: title }),
  ).toBeVisible();
  await expect(
    publicPage
      .locator('.solution-card')
      .filter({ hasText: title })
      .locator('.solution-visual-cloud'),
  ).toBeVisible();
  await expect(publicPage.locator('.instructor-photo')).toBeVisible();
  await publicPage.locator('.instructor-photo').scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      publicPage
        .locator('.instructor-photo')
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  const menu = publicPage.getByRole('button', { name: 'Menyunu aç' });
  if (await menu.isVisible()) await menu.click();
  await publicPage
    .getByRole('navigation', { name: 'Əsas naviqasiya' })
    .getByRole('link', { name: 'IT həllər', exact: true })
    .click();
  await expect(publicPage).toHaveURL(/#solutions$/);
  await fieldset.getByLabel('Xidmətin adı', { exact: true }).fill(title + ' yeniləndi');
  await page.getByRole('button', { name: 'Məzmunu yadda saxla' }).click();
  await expect(page.getByRole('button', { name: 'Məzmunu yadda saxla' })).toBeEnabled();
  await publicPage.reload();
  await expect(publicPage.locator('#solutions')).toContainText(title + ' yeniləndi');
  page.once('dialog', (dialog) => dialog.accept());
  await fieldset.getByRole('button', { name: 'Xidməti sil', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Şəkli sil', exact: true }).click();
  await expect(page.getByText('Şəkil silindi.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Məzmunu yadda saxla' }).click();
  await expect(page.getByRole('button', { name: 'Məzmunu yadda saxla' })).toBeEnabled();
  await publicPage.reload();
  await expect(publicPage.locator('.instructor-photo')).toHaveCount(0);
  await expect(publicPage.locator('#solutions')).not.toContainText(title);
  await publicPage.close();
});

test('instructor gallery accepts multiple photos and supports keyboard scrolling', async ({
  page,
}) => {
  await login(page);
  await nav(page, 'Sayt məzmunu');
  const first = await sharp({
    create: { width: 160, height: 200, channels: 3, background: '#a8caec' },
  })
    .png()
    .toBuffer();
  const second = await sharp({
    create: { width: 160, height: 200, channels: 3, background: '#f0c5a3' },
  })
    .png()
    .toBuffer();
  await page.getByLabel('Şəkillər əlavə et', { exact: true }).setInputFiles([
    { name: 'first.png', mimeType: 'image/png', buffer: first },
    { name: 'second.png', mimeType: 'image/png', buffer: second },
  ]);
  await expect(page.locator('.ad-photo-list img')).toHaveCount(2);
  await expect(
    page.getByText('Şəkil yükləndi və saytda yayımlandı.', { exact: true }),
  ).toBeVisible();
  const preview = await page.context().newPage();
  await preview.goto('/');
  await expect(preview.locator('.instructor-photo')).toHaveCount(2);
  await preview.locator('.gallery-track').scrollIntoViewIfNeeded();
  await preview.getByRole('button', { name: 'Növbəti şəkil', exact: true }).click();
  await expect(preview.locator('.gallery-controls')).toContainText('2 / 2');
  await preview.locator('.gallery-track').focus();
  await preview.keyboard.press('ArrowLeft');
  await expect(preview.locator('.gallery-controls')).toContainText('1 / 2');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Şəkil 1 sil', exact: true }).click();
  await expect(page.locator('.ad-photo-list img')).toHaveCount(1);
  await preview.reload();
  await expect(preview.locator('.instructor-photo')).toHaveCount(1);
  await expect(preview.locator('.gallery-controls')).toHaveCount(0);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Şəkli sil', exact: true }).click();
  await expect(page.locator('.ad-photo-list img')).toHaveCount(0);
  await preview.close();
});

test('logo upload appears in both brand locations and can be replaced or removed', async ({
  page,
}) => {
  await login(page);
  await nav(page, 'Sayt məzmunu');
  const image = await sharp({
    create: { width: 300, height: 90, channels: 4, background: '#12345680' },
  })
    .png()
    .toBuffer();
  const input = page.getByLabel('Loqo əlavə et / dəyiş', { exact: true });
  await input.setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: image });
  await expect(page.getByRole('status')).toContainText('Loqo yükləndi');
  const first = await page.getByAltText('Loqo — önbaxış').getAttribute('src');
  await page.getByRole('button', { name: 'Məzmunu yadda saxla' }).click();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Sayta bax', exact: true })).toBeVisible();
  await nav(page, 'Sayt məzmunu');
  await expect(page.getByAltText('Loqo — önbaxış')).toHaveAttribute('src', first!);
  const publicPage = await page.context().newPage();
  await publicPage.goto('/');
  await expect(publicPage.locator('.brand-image')).toHaveCount(2);
  for (const logo of await publicPage.locator('.brand-image').all()) {
    await expect(logo).toHaveAttribute('src', first!);
    expect(
      await logo.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0),
    ).toBe(true);
  }
  await input.setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: image });
  await expect(page.getByAltText('Loqo — önbaxış')).not.toHaveAttribute('src', first!);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Loqonu sil', exact: true }).click();
  await expect(page.getByAltText('Loqo — önbaxış')).toHaveCount(0);
  await publicPage.reload();
  await expect(publicPage.locator('.brand-image')).toHaveCount(0);
  await expect(publicPage.locator('.brand-wordmark')).toHaveCount(2);
  await publicPage.close();
});
