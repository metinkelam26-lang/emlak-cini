import { test, expect } from '@playwright/test';

test('production uygulamasi aciliyor', async ({ page }) => {
  await page.goto('https://trendemlakasistan.vercel.app', {
    waitUntil: 'networkidle',
  });

  await expect(page.locator('body')).toBeVisible();
  await expect(page).toHaveTitle(/./);
});
