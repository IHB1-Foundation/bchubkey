import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { API_ORIGIN, WEB_ORIGIN } from './fixtures';

type HealthPayload = {
  status: string;
  db: string;
  dbLatencyMs: number;
  uptime: number;
  demoMode: boolean;
  timestamp: string;
  authEnabled: boolean;
};

async function readHealth(request: APIRequestContext) {
  const start = Date.now();
  const response = await request.get(`${API_ORIGIN}/api/health`);
  const elapsedMs = Date.now() - start;
  return { response, elapsedMs };
}

test.describe('Live deployment observability checks', () => {
  test('health endpoint responds under latency budget with valid data', async ({ request }) => {
    const { response, elapsedMs } = await readHealth(request);
    expect(response.status()).toBe(200);

    const data = (await response.json()) as HealthPayload;
    expect(data.status).toBe('ok');
    expect(data.db).toBe('ok');
    expect(data.dbLatencyMs).toBeGreaterThanOrEqual(0);
    expect(data.authEnabled).toBe(true);

    // Budget focuses on user-perceived API responsiveness in deployed environment.
    expect(elapsedMs).toBeLessThan(3_000);
  });

  test('health uptime is monotonic across sequential probes', async ({ request }) => {
    const first = await request.get(`${API_ORIGIN}/api/health`);
    expect(first.status()).toBe(200);
    const firstBody = (await first.json()) as HealthPayload;

    await new Promise((resolve) => setTimeout(resolve, 1_100));

    const second = await request.get(`${API_ORIGIN}/api/health`);
    expect(second.status()).toBe(200);
    const secondBody = (await second.json()) as HealthPayload;

    expect(secondBody.uptime).toBeGreaterThanOrEqual(firstBody.uptime);
  });

  test('main document serves over HSTS with expected content type', async ({ page }) => {
    const response = await page.goto(WEB_ORIGIN, { waitUntil: 'domcontentloaded' });
    expect(response).not.toBeNull();

    const headers = response!.headers();
    expect(response!.status()).toBe(200);
    expect(headers['content-type']).toContain('text/html');
    expect(headers['strict-transport-security']).toContain('max-age');
  });

  test('runtime env.js points web app to deployed API origin', async ({ request }) => {
    const response = await request.get(`${WEB_ORIGIN}/env.js`);
    expect(response.status()).toBe(200);

    const raw = await response.text();
    const match = raw.match(/API_BASE_URL:\s*'([^']+)'/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe(API_ORIGIN);
  });
});
