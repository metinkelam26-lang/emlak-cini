import { test, expect } from '@playwright/test';

test('kullanici girisi ve dashboard acilisi', async ({ page }) => {
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

  await expect(
    page.getByText('Bugün ne yapmalısın?', { exact: true })
  ).toBeVisible({ timeout: 15000 });
});
