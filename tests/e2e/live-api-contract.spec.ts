import { expect, test } from '@playwright/test';
import { API_ORIGIN } from './fixtures';

test.describe('Live deployed API contract checks', () => {
  test('health endpoint returns expected schema', async ({ request }) => {
    const res = await request.get(`${API_ORIGIN}/api/health`);
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(typeof data.db).toBe('string');
    expect(typeof data.dbLatencyMs).toBe('number');
    expect(typeof data.uptime).toBe('number');
    expect(typeof data.demoMode).toBe('boolean');
    expect(typeof data.authEnabled).toBe('boolean');

    const timestamp = Date.parse(data.timestamp);
    expect(Number.isNaN(timestamp)).toBeFalsy();
  });

  test('protected endpoints reject unauthenticated access with 401', async ({ request }) => {
    const [groupsRes, meRes, logoutRes] = await Promise.all([
      request.get(`${API_ORIGIN}/api/groups`),
      request.get(`${API_ORIGIN}/api/auth/me`),
      request.post(`${API_ORIGIN}/api/auth/logout`, { data: {} }),
    ]);

    for (const res of [groupsRes, meRes, logoutRes]) {
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Authentication required');
    }
  });
});
