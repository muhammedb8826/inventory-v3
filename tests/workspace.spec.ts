import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@example.test');
  await page.getByLabel('Password', { exact: true }).fill('TestPassword123!');
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL('**/dashboard');
}
test('cookie session, modern table, export and partial bulk failures', async ({ page }) => {
  await login(page);
  const cookies = await page.context().cookies();
  expect(cookies.filter(c => c.name.startsWith('inventory_')).every(c => c.httpOnly)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('stock_refresh_token'))).toBeNull();
  await page.goto('/customers', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible();
  await expect(page.getByText('Acacia Studio', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Select all rows on this page' }).click();
  await expect(page.getByText('3 selected on this page')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export selected' }).click();
  expect((await download).suggestedFilename()).toContain('selected.csv');
  await page.getByRole('button', { name: 'Deactivate selected' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm action' }).click();
  await expect(page.getByText('Customer has open documents', { exact: false })).toBeVisible();
  await expect(page.getByText('1 selected on this page')).toBeVisible();
  await page.screenshot({ path: 'test-results/customers-desktop.png', fullPage: true });
});
test('tables support mobile width and WCAG checks', async ({ page }) => {
  await login(page); await page.goto('/customers', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Acacia Studio', { exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page }).include('#workspace-content').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/customers-mobile.png', fullPage: true });
});
test('cross-site writes are rejected by the session proxy', async ({ request }) => {
  const response = await request.post('/api/backend/auth/login', { headers: { origin: 'https://untrusted.test' }, data: {} });
  expect(response.status()).toBe(403);
});
