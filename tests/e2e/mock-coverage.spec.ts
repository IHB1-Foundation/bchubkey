import { expect, test } from '@playwright/test';
import {
  API_ORIGIN,
  GROUP_DETAIL_PAYLOAD,
  GROUPS_PAYLOAD,
  WEB_ORIGIN,
  json,
  withApiRouter,
} from './fixtures';

test.describe('Frontend behavioral coverage with deployed UI + mocked API', () => {
  test('auth-disabled mode renders dashboard list and detail flow', async ({ page }) => {
    await withApiRouter(page, async (route, path) => {
      if (path === '/api/health') {
        await json(route, { status: 'ok', db: 'ok', dbLatencyMs: 2, authEnabled: false, demoMode: false });
        return;
      }
      if (path === '/api/groups') {
        await json(route, GROUPS_PAYLOAD);
        return;
      }
      if (path === '/api/groups/-1001000000001') {
        await json(route, GROUP_DETAIL_PAYLOAD);
        return;
      }
      await json(route, { error: `Unhandled path ${path}` }, 404);
    });

    await page.goto(WEB_ORIGIN);

    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.locator('#groups-table table')).toBeVisible();
    await expect(page.locator('#groups-table')).toContainText('Alpha Group');
    await expect(page.locator('#stats')).toContainText('2');

    await page.locator('#groups-table a', { hasText: 'Alpha Group' }).click();
    await expect(page.locator('#detail-view')).toBeVisible();
    await expect(page.locator('#detail-content')).toContainText('Members (2)');
    await expect(page.locator('#detail-content')).toContainText('Recent Logs');

    await page.getByRole('link', { name: /Back to groups/i }).click();
    await expect(page.locator('#list-view')).toBeVisible();
  });

  test('restores session, shows user identity, and logs out cleanly', async ({ page }) => {
    const called: string[] = [];

    await page.addInitScript(() => {
      localStorage.setItem('admin_token', 'pretend.jwt.value');
    });

    await withApiRouter(page, async (route, path, method) => {
      called.push(`${method} ${path}`);

      if (path === '/api/health') {
        await json(route, { status: 'ok', db: 'ok', dbLatencyMs: 3, authEnabled: true, demoMode: false });
        return;
      }
      if (path === '/api/auth/me') {
        await json(route, {
          user: {
            id: 'admin-1',
            telegramId: '10001',
            username: 'opsadmin',
            firstName: 'Ops',
            isSuperAdmin: false,
          },
        });
        return;
      }
      if (path === '/api/groups') {
        await json(route, GROUPS_PAYLOAD);
        return;
      }
      if (path === '/api/auth/logout' && method === 'POST') {
        await json(route, { ok: true });
        return;
      }
      await json(route, { error: `Unhandled path ${path}` }, 404);
    });

    await page.goto(WEB_ORIGIN);

    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.locator('#user-info')).toContainText('@opsadmin');
    await expect(page.locator('#logout-btn')).toBeVisible();

    await page.locator('#logout-btn').click();

    await expect(page.getByRole('heading', { name: 'Admin Access' })).toBeVisible();
    const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('admin_token'));
    expect(tokenAfterLogout).toBeNull();
    expect(called).toContain('POST /api/auth/logout');
  });

  test('renders clear errors for failing groups API and failing detail API', async ({ page }) => {
    let detailAttempted = false;

    await withApiRouter(page, async (route, path) => {
      if (path === '/api/health') {
        await json(route, { status: 'ok', db: 'ok', dbLatencyMs: 1, authEnabled: false, demoMode: false });
        return;
      }
      if (path === '/api/groups') {
        await json(route, GROUPS_PAYLOAD);
        return;
      }
      if (path === '/api/groups/-1001000000001') {
        detailAttempted = true;
        await json(route, { error: 'boom' }, 500);
        return;
      }
      await json(route, { error: `Unhandled path ${path}` }, 404);
    });

    await page.goto(WEB_ORIGIN);
    await page.locator('#groups-table a', { hasText: 'Alpha Group' }).click();

    await expect(page.locator('#detail-content')).toContainText('Failed: API 500');
    expect(detailAttempted).toBeTruthy();

    // Force list re-fetch to verify list-level errors too.
    await page.unroute(`${API_ORIGIN}/api/**`);
    await withApiRouter(page, async (route, path) => {
      if (path === '/api/health') {
        await json(route, { status: 'ok', db: 'ok', dbLatencyMs: 1, authEnabled: false, demoMode: false });
        return;
      }
      if (path === '/api/groups') {
        await json(route, { error: 'server down' }, 503);
        return;
      }
      await json(route, { error: `Unhandled path ${path}` }, 404);
    });

    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect(page.locator('#groups-table')).toContainText('Failed to load groups: API 503');
  });

  test('falls back to Offline indicator when health endpoint is unavailable', async ({ page }) => {
    await withApiRouter(page, async (route, path) => {
      if (path === '/api/health') {
        await route.abort('failed');
        return;
      }
      await json(route, { error: `Unhandled path ${path}` }, 404);
    });

    await page.goto(WEB_ORIGIN);

    await expect(page.locator('#health-text')).toHaveText('Offline');
    await expect(page.getByRole('heading', { name: 'Admin Access' })).toBeVisible();
  });

  test('shows DEMO marker in health status when backend is in demo mode', async ({ page }) => {
    await withApiRouter(page, async (route, path) => {
      if (path === '/api/health') {
        await json(route, { status: 'ok', db: 'ok', dbLatencyMs: 7, authEnabled: true, demoMode: true });
        return;
      }
      await json(route, { error: `Unhandled path ${path}` }, 404);
    });

    await page.goto(WEB_ORIGIN);

    await expect(page.locator('#health-text')).toContainText('DEMO');
  });

  test('renders missing bot-username warning when BOT_USERNAME is empty', async ({ page }) => {
    await page.route(`${WEB_ORIGIN}/env.js`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: [
          'window.__ENV__ = {',
          "  WEB_ORIGIN_PRIMARY: 'https://bchubkey.com',",
          "  WEB_ORIGIN_WWW: 'https://www.bchubkey.com',",
          "  API_BASE_URL: 'https://api.bchubkey.com',",
          "  BOT_USERNAME: '',",
          '};',
        ].join('\n'),
      });
    });

    await withApiRouter(page, async (route, path) => {
      if (path === '/api/health') {
        await json(route, { status: 'ok', db: 'ok', dbLatencyMs: 1, authEnabled: true, demoMode: false });
        return;
      }
      await json(route, { error: `Unhandled path ${path}` }, 404);
    });

    await page.goto(WEB_ORIGIN);

    await expect(page.locator('#telegram-login')).toContainText('Bot username not configured');
  });

  test('renders access-denied message when API returns 403 on protected group detail', async ({ page }) => {
    await withApiRouter(page, async (route, path) => {
      if (path === '/api/health') {
        await json(route, { status: 'ok', db: 'ok', dbLatencyMs: 1, authEnabled: false, demoMode: false });
        return;
      }
      if (path === '/api/groups') {
        await json(route, GROUPS_PAYLOAD);
        return;
      }
      if (path === '/api/groups/-1001000000001') {
        await json(route, { error: 'forbidden' }, 403);
        return;
      }
      await json(route, { error: `Unhandled path ${path}` }, 404);
    });

    await page.goto(WEB_ORIGIN);
    await page.locator('#groups-table a', { hasText: 'Alpha Group' }).click();

    await expect(page.locator('#detail-content')).toContainText('Failed: Access denied');
  });

  test('escapes group titles to avoid HTML injection in the table', async ({ page }) => {
    await withApiRouter(page, async (route, path) => {
      if (path === '/api/health') {
        await json(route, { status: 'ok', db: 'ok', dbLatencyMs: 1, authEnabled: false, demoMode: false });
        return;
      }
      if (path === '/api/groups') {
        await json(route, {
          groups: [
            {
              id: '-1001000000999',
              title: '<img src=x onerror=window.__xss_hit=true>Injected',
              mode: 'KICK',
              status: 'ACTIVE',
              passCount: 1,
              failCount: 0,
              memberCount: 1,
              createdAt: '2026-02-25T23:00:27.779Z',
            },
          ],
        });
        return;
      }
      await json(route, { error: `Unhandled path ${path}` }, 404);
    });

    await page.goto(WEB_ORIGIN);

    await expect(page.locator('#groups-table')).toContainText('<img src=x onerror=window.__xss_hit=true>Injected');
    await expect(page.locator('#groups-table img')).toHaveCount(0);
    const xssHit = await page.evaluate(() => (window as Window & { __xss_hit?: boolean }).__xss_hit === true);
    expect(xssHit).toBeFalsy();
  });
});
