import { test, expect } from '@playwright/test';

test('musteri eslesme motoru production UI uzerinden dogru sonucu gosteriyor', async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  test.skip(!email || !password, 'TEST_EMAIL / TEST_PASSWORD eksik');

  await page.goto('https://trendemlakasistan.vercel.app', {
    waitUntil: 'networkidle',
  });

  await page.locator('#auth-email').fill(email!);
  await page.locator('#auth-password').fill(password!);

  await page
    .locator('form')
    .getByRole('button', { name: 'Giriş yap' })
    .click();

  await expect(page.locator('#auth-email')).toHaveCount(0, {
    timeout: 15000,
  });

  await page.getByRole('button', { name: 'Müşteriler' }).click();

  await expect(
    page.getByText('E2E Ayşe Demir', { exact: true })
  ).toBeVisible({ timeout: 10000 });

  const customerCard = page
    .getByText('E2E Ayşe Demir', { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"bg-white")]')
    .first();

  await customerCard
    .getByRole('button', { name: 'Eşleşen İlanlar' })
    .click();

  await expect(
    page.getByRole('heading', { name: 'Eşleşen İlanlar' })
  ).toBeVisible();

  const listingTitle = page.getByText(
    'E2E Çamlıca Parka Yakın 3+1 Aile Dairesi',
    { exact: true }
  );

  await expect(listingTitle).toBeVisible({ timeout: 10000 });

  const listingCard = listingTitle
    .locator('xpath=ancestor::div[contains(@class,"border")]')
    .first();

  await expect(listingCard.getByText('%98', { exact: true })).toBeVisible();

  await expect(listingCard.getByText(/Butce araliginda/i)).toBeVisible();
  await expect(listingCard.getByText(/Ilce uyuyor/i)).toBeVisible();
  await expect(listingCard.getByText(/Mahalle uyuyor/i)).toBeVisible();
  await expect(listingCard.getByText(/Oda sayisi uyuyor/i)).toBeVisible();
  await expect(listingCard.getByText(/Metrekare araliginda/i)).toBeVisible();
});

