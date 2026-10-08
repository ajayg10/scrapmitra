import { test, expect } from '@playwright/test';

test('v2 golden path: scan, hazard guard, circular decision, pickup QR, and collector savings', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));

  await page.goto('/');

  // 1. Language switching
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  // 2. Perform inspection
  const scanBtn = page.getByRole('button', { name: 'Scan Electronic Device' });
  await expect(scanBtn).toBeVisible();
  await scanBtn.click();

  // 3. Inspect Hazard Guard Banner & Circular Decision
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Never put this in household waste').first()).toBeVisible();
  await expect(page.getByText('Screen Repair & Refurbishment')).toBeVisible();
  await expect(page.getByText('Hierarchy Comparison: Choices vs Throwing Away')).toBeVisible();

  // 4. Arrange Pickup -> Switch to Pickup & QR tab
  const arrangePickupBtn = page.getByRole('button', { name: 'Arrange Doorstep Pickup' }).first();
  await expect(arrangePickupBtn).toBeVisible();
  await arrangePickupBtn.click();

  await expect(page.getByText('Single-Use Token')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm Handover with Collector (2-Party)' })).toBeVisible();

  // 5. Collector Mode: verify measured km saved
  await page.getByRole('button', { name: 'Collector Mode' }).click();
  await expect(page.getByText('Measured Kilometres Saved')).toBeVisible();
  await expect(page.getByText('28.4 km')).toBeVisible();

  // 6. Admin Oversight: run pickup aggregation
  await page.getByRole('button', { name: 'Admin Oversight' }).click();
  const runAggBtn = page.getByRole('button', { name: 'Run Pickup Aggregation Now' });
  await expect(runAggBtn).toBeVisible();
  await runAggBtn.click();
  await expect(page.getByText('✓ Aggregation Dispatched!')).toBeVisible();

  // 7. Verify Hindi switching
  await page.getByRole('button', { name: 'हिंदी', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');

  // No unhandled page errors
  expect(failures).toEqual([]);
});
