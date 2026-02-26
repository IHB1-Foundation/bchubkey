import { expect, test } from '@playwright/test';
import { API_ORIGIN, WEB_ORIGIN } from './fixtures';

test.describe('Live deployment smoke checks', () => {
  test('serves favicon and manifest assets', async ({ request }) => {
    const [favicon, manifest] = await Promise.all([
      request.get(`${WEB_ORIGIN}/favicon.svg`),
      request.get(`${WEB_ORIGIN}/site.webmanifest`),
    ]);

    expect(favicon.status()).toBe(200);
    expect((await favicon.text()).toLowerCase()).toContain('<svg');

    expect(manifest.status()).toBe(200);
    expect(await manifest.json()).toMatchObject({
      name: 'BCHubKey Admin',
      short_name: 'BCHubKey',
    });
  });

  test('loads production landing and reaches an online/offline health state', async ({ page }) => {
    const apiRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().startsWith(API_ORIGIN)) apiRequests.push(req.url());
    });

    await page.goto(WEB_ORIGIN, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/BCHubKey Admin/i);
    await expect(page.getByRole('heading', { name: /Control Deck/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Admin Access' })).toBeVisible();

    await expect
      .poll(async () => (await page.locator('#health-text').textContent())?.trim() ?? '', {
        timeout: 20_000,
      })
      .toMatch(/OK|Offline/i);

    expect(apiRequests.some((url) => url.endsWith('/api/health'))).toBeTruthy();
  });

  test('injects Telegram login widget with production bot username', async ({ page }) => {
    await page.goto(WEB_ORIGIN);

    const widget = page.locator('#telegram-login script[src*="telegram-widget.js"]');
    await expect(widget).toHaveCount(1);

    const botName = await widget.getAttribute('data-telegram-login');
    expect(botName).toBe('BCHubkeyBot');
  });

  test('theme toggle persists in localStorage across reload', async ({ page }) => {
    await page.goto(WEB_ORIGIN);

    const initial = await page.evaluate(() => localStorage.getItem('theme') || 'light');
    await page.getByRole('button', { name: 'Theme' }).click();

    const toggled = await page.evaluate(() => localStorage.getItem('theme') || 'light');
    expect(toggled).not.toBe(initial);

    await page.reload();
    const applied = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(applied).toBe(toggled);
  });

  test('invalid stored token is rejected and removed', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('admin_token', 'invalid.token.payload');
    });

    await page.goto(WEB_ORIGIN);

    const meResponse = await page.waitForResponse(
      (res) => res.url() === `${API_ORIGIN}/api/auth/me` && res.request().method() === 'GET'
    );
    expect(meResponse.status()).toBe(401);

    await expect(page.getByRole('heading', { name: 'Admin Access' })).toBeVisible();
    const token = await page.evaluate(() => localStorage.getItem('admin_token'));
    expect(token).toBeNull();
  });

  test('refresh requests protected groups endpoint and keeps user unauthenticated', async ({
    page,
  }) => {
    await page.goto(WEB_ORIGIN);

    const groupsResponsePromise = page.waitForResponse(
      (res) => res.url() === `${API_ORIGIN}/api/groups` && res.request().method() === 'GET'
    );

    await page.getByRole('button', { name: 'Refresh' }).click();

    const groupsResponse = await groupsResponsePromise;
    expect(groupsResponse.status()).toBe(401);
    await expect(page.getByRole('heading', { name: 'Admin Access' })).toBeVisible();
  });
});
