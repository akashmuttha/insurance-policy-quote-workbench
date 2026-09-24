import { expect, test } from '@playwright/test';

test('customer can validate, quote through the real API, edit, and start again', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.screenshot({ path: testInfo.outputPath('submission-form.png'), fullPage: true });
  await page.getByRole('button', { name: /calculate quote/i }).click();
  await expect(page.getByRole('alert')).toBeFocused();
  await page.getByRole('link', { name: /customer name: enter/i }).click();
  await expect(page.getByLabel('Customer name', { exact: true })).toBeFocused();

  // Follow the form's natural keyboard order rather than filling every control by mouse.
  await page.keyboard.type('Asha Kulkarni');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Insurance product', { exact: true })).toBeFocused();
  await page.keyboard.press('m');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Coverage amount', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  const response = page.waitForResponse(r => r.url().endsWith('/api/quotes') && r.request().method() === 'POST');
  await page.keyboard.press('Enter');
  expect((await response).status()).toBe(201);
  await expect(page.getByRole('heading', { name: 'Your quote summary' })).toBeFocused();
  const estimate = page.getByRole('complementary', { name: 'Premium estimate' });
  await expect(estimate.getByText('₹10,000', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('quote.png'), fullPage: true });

  await page.getByRole('button', { name: 'Edit submission' }).click();
  await expect(page.getByLabel('Customer name', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Customer name', { exact: true })).toHaveValue('Asha Kulkarni');
  await page.getByLabel('Coverage amount', { exact: true }).selectOption('1000000');
  await page.getByRole('button', { name: /calculate quote/i }).click();
  await expect(estimate.getByText('₹20,000', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New submission' }).click();
  await expect(page.getByLabel('Customer name', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Customer name', { exact: true })).toBeFocused();
});

test('combined filters, selection, reset, and responsive details work together', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Policy overview', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('6 policies found');
  await page.getByLabel('Product', { exact: true }).selectOption('Health Protect');
  await page.getByLabel('Status', { exact: true }).selectOption('Active');
  await page.getByRole('searchbox').fill('  MEERA  ');
  await expect(page.getByRole('status')).toHaveText('1 policy found');
  await page.getByRole('button', { name: 'View details for Meera Joshi' }).click();
  const details = page.getByRole('complementary', { name: 'Policy details' });
  await expect(details.getByText('Meera Joshi', { exact: true })).toBeVisible();
  const panelBox = await details.boundingBox();
  const listBox = await page.getByRole('list').boundingBox();
  expect(panelBox).not.toBeNull();
  expect(listBox).not.toBeNull();
  if (testInfo.project.name === 'desktop') {
    expect(panelBox!.x).toBeGreaterThanOrEqual(listBox!.x + listBox!.width);
  } else {
    expect(panelBox!.y).toBeGreaterThanOrEqual(listBox!.y + listBox!.height);
    await expect(page.getByRole('heading', { name: 'Policy details' })).toBeFocused();
  }
  await page.screenshot({ path: testInfo.outputPath('policies.png'), fullPage: true });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View details for Meera Joshi' })).toBeFocused();
  await page.getByLabel('Product', { exact: true }).selectOption('Motor Comprehensive');
  await expect(page.getByText('No matching policies found.')).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.getByRole('status')).toHaveText('6 policies found');
  await page.getByRole('button', { name: 'View details for Asha Kulkarni' }).click();
  await expect(details.getByText('Asha Kulkarni', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View details for Rohan Deshpande' }).click();
  await expect(details.getByText('Rohan Deshpande', { exact: true })).toBeVisible();
  await expect(details.getByText('Asha Kulkarni', { exact: true })).toHaveCount(0);
  await page.getByLabel('Product', { exact: true }).selectOption('Home Secure');
  await expect(page.getByRole('heading', { name: 'Select a policy' })).toBeVisible();
  // Include a narrow phone width to catch overflow missed by component tests.
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('a failed quote keeps the form usable and retries against the API', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Customer name', { exact: true }).fill('Asha Kulkarni');
  await page.getByLabel('Insurance product', { exact: true }).selectOption('Motor');
  await page.route('**/api/quotes', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Unavailable"}' }), { times: 1 });
  await page.getByRole('button', { name: /calculate quote/i }).click();
  await expect(page.getByRole('alert')).toContainText('Please try again');
  await expect(page.getByLabel('Customer name', { exact: true })).toHaveValue('Asha Kulkarni');
  await page.getByRole('button', { name: /calculate quote/i }).click();
  await expect(page.getByRole('heading', { name: 'Your quote summary' })).toBeVisible();
});
