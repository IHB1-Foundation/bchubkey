import { expect, test } from '@playwright/test';
import { WEB_ORIGIN } from './fixtures';

test.describe('UI quality and resilience checks', () => {
  test('boots without uncaught runtime errors', async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (err) => runtimeErrors.push(err.message));

    await page.goto(WEB_ORIGIN, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Control Deck/i })).toBeVisible();

    expect(runtimeErrors).toEqual([]);
  });

  test('keyboard users can reach all top controls', async ({ page }) => {
    await page.goto(WEB_ORIGIN);

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Theme' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeFocused();
  });

  test('mobile viewport has no horizontal overflow in login state', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(WEB_ORIGIN);

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });

    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByRole('heading', { name: 'Admin Access' })).toBeVisible();
  });
});
