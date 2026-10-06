import { test, expect } from '@playwright/test';

test('bilingual catalog is usable and the unfinished scanner is explicit', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Take a photo', exact: true })).toBeDisabled();
  await expect(page.getByText('Scanning is being built. No photos are uploaded in this preview.')).toBeVisible();
  await page.getByRole('button', { name: 'Explore supported devices' }).click();
  await expect(page.locator('#device-catalog li')).toHaveCount(25);
  await page.getByRole('button', { name: 'हिंदी', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await expect(page.getByRole('button', { name: 'फोटो लें', exact: true })).toBeDisabled();
  await expect(page.getByText('मोबाइल फोन', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(failures).toEqual([]);
});
