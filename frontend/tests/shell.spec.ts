import { test, expect } from '@playwright/test';

test('v2 golden path: scan, hazard guard, circular decision, pickup QR, and collector savings', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));

  await page.goto('/');

  // 1. Language switching & Household Persona
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'Household', exact: true }).click();

  // 2. Perform inspection
  await page.getByRole('button', { name: /Smartphone/i }).click();
  const scanBtn = page.getByRole('button', { name: 'Inspect Device Now' });
  await expect(scanBtn).toBeVisible();
  await scanBtn.click();

  // 3. Inspect Hazard Guard Banner & Circular Decision (Wait for live Bedrock / decision pipeline)
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Never put this in household waste').first()).toBeVisible();
  await expect(page.getByText('Screen Repair & Refurbishment')).toBeVisible();
  await expect(page.getByText('Hierarchy Comparison: Choices vs Throwing Away')).toBeVisible();

  // 4. Arrange Pickup -> Switch to Pickup & QR tab
  const arrangePickupBtn = page.getByRole('button', { name: 'Arrange Doorstep Pickup' }).first();
  await expect(arrangePickupBtn).toBeVisible();
  await arrangePickupBtn.click();

  await expect(page.getByText('Single-Use Token')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm Handover with Collector (2-Party)' })).toBeVisible();

  // 5. Collector Mode: switch to Collector persona and view tab
  await page.getByRole('button', { name: 'Collector', exact: true }).click();
  await page.getByRole('button', { name: 'Collector Mode' }).click();
  await expect(page.getByText('Measured Kilometres Saved')).toBeVisible();
  await expect(page.locator('.metric-val.highlight')).toContainText('km');

  // 6. Admin Oversight: switch to Admin persona and view tab
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
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
