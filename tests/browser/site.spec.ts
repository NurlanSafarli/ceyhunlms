import { test, expect } from '@playwright/test';

test('home, navigation, contact details and responsive layout', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/Jayhun Tech/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('IT karyerana');
  await expect(page.locator('a[href="tel:+994513019525"]').first()).toBeVisible();
  await expect(page.locator('.course-card')).toHaveCount(3);
  if (info.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Menyunu aç' }).click();
    await expect(page.getByRole('navigation')).toBeVisible();
    await page.getByRole('navigation').getByRole('link', { name: 'Sillabus', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Menyunu aç' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  } else {
    await page.getByRole('navigation').getByRole('link', { name: 'Sillabus', exact: true }).click();
  }
  await expect(page).toHaveURL(/#syllabus$/);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test('all syllabus tabs, module details, keyboard navigation and download work', async ({
  page,
}) => {
  await page.goto('/#syllabus');
  await page.getByRole('tab', { name: 'Sistem inzibatçılığı' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Windows Server və Active Directory');
  await page.getByRole('button', { name: /Windows Server və Active Directory/ }).click();
  await expect(
    page.getByText('Domen kontrollerinin quraşdırılması', { exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Şəbəkə inzibatçılığı' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('IP ünvanlama və subnetting');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Sillabusu yüklə/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('jayhun-tech-network-admin-sillabus.txt');
  const stream = await download.createReadStream();
  let content = '';
  for await (const chunk of stream!) content += chunk.toString('utf8');
  expect(content).toContain('VLAN');
  expect(content).toContain('+994 51 301 95 25');
  await page.getByRole('tab', { name: 'Şəbəkə inzibatçılığı' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Help Desk' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('course actions preselect the correct syllabus and registration', async ({ page }) => {
  await page.goto('/');
  const card = page
    .locator('.course-card')
    .filter({ has: page.getByRole('heading', { name: 'Şəbəkə inzibatçılığı', exact: true }) });
  await card.getByRole('link', { name: 'Sillabusa bax' }).click();
  await expect(page.getByRole('tab', { name: 'Şəbəkə inzibatçılığı' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('link', { name: 'Bu kursa qoşul' }).click();
  await expect(page.getByLabel('Maraqlandığınız istiqamət')).toHaveValue('network-admin');
});

test('registration persists, displays a reference, and rejects a duplicate', async ({
  page,
}, info) => {
  await page.goto('/#register');
  const fill = async () => {
    await page.getByLabel('Ad və soyad').fill('Sınaq Tələbə');
    await page.getByLabel('Telefon nömrəsi').fill('+994 50 123 45 67');
    await page.getByLabel('E-poçt').fill(`browser-${info.project.name}@example.test`);
    await page.getByLabel('Maraqlandığınız istiqamət').selectOption('help-desk');
    await page.getByLabel('Hazırkı səviyyəniz').selectOption('basic');
    await page.getByLabel('Dərs formatı', { exact: true }).selectOption('online');
    await page.getByRole('checkbox').check();
  };
  await fill();
  const result = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/registrations') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Müraciət göndər' }).click();
  expect((await result).status()).toBe(201);
  await expect(page.getByRole('heading', { name: 'Təşəkkürlər, Sınaq!' })).toBeVisible();
  await expect(page.locator('.reference-box')).toContainText(/JT-[A-F0-9]{8}/);
  await page.getByRole('button', { name: 'Yeni müraciət' }).click();
  await fill();
  await page.getByRole('button', { name: 'Müraciət göndər' }).click();
  await expect(page.getByRole('alert')).toContainText('artıq müraciət edilib');
});

test('failed network request shows an error and preserves form data', async ({ page }) => {
  await page.goto('/#register');
  await page.route('**/api/registrations', (route) => route.abort());
  await page.getByLabel('Ad və soyad').fill('Əlaqə Sınağı');
  await page.getByLabel('Telefon nömrəsi').fill('0501234567');
  await page.getByLabel('E-poçt').fill('offline@example.test');
  await page.getByLabel('Maraqlandığınız istiqamət').selectOption('undecided');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Müraciət göndər' }).click();
  await expect(page.getByRole('alert')).toContainText('Serverlə əlaqə qurulmadı');
  await expect(page.getByLabel('Ad və soyad')).toHaveValue('Əlaqə Sınağı');
});

test('privacy dialog and FAQ are accessible and interactive', async ({ page }) => {
  await page.goto('/#register');
  await page.locator('.consent').getByRole('button', { name: 'Məxfilik şərtləri' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('+994 51 301 95 25');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const faq = page.getByRole('button', { name: 'Kursun qiyməti və ödəniş qaydası necədir?' });
  await faq.click();
  await expect(faq).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByText('Formanı doldurmaq ödəniş öhdəliyi yaratmır.', { exact: false }),
  ).toBeVisible();
  await faq.click();
  await expect(faq).toHaveAttribute('aria-expanded', 'false');
});
