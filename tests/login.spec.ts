import { test, expect } from '@playwright/test';

test('kullanici girisi ve dashboard acilisi', async ({ page }) => {
  const email = 'ornek+trend01@gmail.com';
  const password = '123456';

  await page.goto('https://trendemlakasistan.vercel.app', {
    waitUntil: 'networkidle',
  });

  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill(password);

  await page.locator('form').getByRole('button', { name: 'Giriş yap' }).click();

  await page.waitForLoadState('networkidle');

  await expect(page.locator('body')).toBeVisible();

  console.log('Giriş sonrası URL:', page.url());
});