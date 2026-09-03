import { test, expect } from '@playwright/test';

test('guclu eslesme aksiyona donusuyor ve gosterildi sonrasi kayboluyor', async ({ page }) => {
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

  await page.waitForTimeout(4000);

  await expect(
    page.getByText('Bugün ne yapmalısın?', { exact: true })
  ).toBeVisible({ timeout: 15000 });

  const customerName = page.getByText('E2E Ayşe Demir', { exact: true });

  await expect(customerName).toBeVisible({ timeout: 15000 });

  const actionCard = customerName
    .locator('xpath=ancestor::div[contains(@class,"bg-white")]')
    .first();

  await expect(
    actionCard.getByText('Güçlü Eşleşme', { exact: true })
  ).toBeVisible();

  await expect(
    actionCard.getByText('E2E Çamlıca Parka Yakın 3+1 Aile Dairesi', {
      exact: false,
    })
  ).toBeVisible();

  const shownButton = actionCard.getByRole('button', {
    name: 'İlanı gösterdim',
  });

  await expect(shownButton).toBeVisible();

  await shownButton.click();

  await expect(
    page.getByText('E2E Ayşe Demir', { exact: true })
  ).toHaveCount(0, {
    timeout: 15000,
  });
});
