import type { Page, Route } from '@playwright/test';

export const WEB_ORIGIN = 'https://www.bchubkey.com';
export const API_ORIGIN = 'https://api.bchubkey.com';

export type ApiGroupsResponse = {
  groups: Array<{
    id: string;
    title: string;
    mode: string;
    status: string;
    passCount: number;
    failCount: number;
    memberCount: number;
    createdAt: string;
  }>;
};

export type ApiGroupDetailResponse = {
  group: { id: string; title: string; mode: string; status: string };
  rule: {
    gateType: 'FT' | 'NFT';
    tokenId: string;
    minAmountBase: string;
    minNftCount: number;
    recheckIntervalSec: number;
    gracePeriodSec: number;
  } | null;
  members: Array<{
    tgUserId: string;
    username?: string | null;
    firstName?: string | null;
    state: string;
    lastBalanceBase: string | null;
    lastCheckedAt: string;
    enforced: string;
  }>;
  logs: Array<{ type: string; tgUserId: string | null; createdAt: string }>;
  stats: Record<string, unknown>;
  filters: { totalCount: number };
};

export function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function withApiRouter(
  page: Page,
  handler: (route: Route, path: string, method: string) => Promise<void>
) {
  await page.route(`${API_ORIGIN}/api/**`, async (route) => {
    const url = new URL(route.request().url());
    await handler(route, url.pathname, route.request().method());
  });
}

export const NOW_ISO = '2026-02-25T23:00:27.779Z';

export const GROUPS_PAYLOAD: ApiGroupsResponse = {
  groups: [
    {
      id: '-1001000000001',
      title: 'Alpha Group',
      mode: 'KICK',
      status: 'ACTIVE',
      passCount: 17,
      failCount: 2,
      memberCount: 24,
      createdAt: NOW_ISO,
    },
    {
      id: '-1001000000002',
      title: 'Beta Group',
      mode: 'RESTRICT',
      status: 'PAUSED',
      passCount: 5,
      failCount: 3,
      memberCount: 10,
      createdAt: NOW_ISO,
    },
  ],
};

export const GROUP_DETAIL_PAYLOAD: ApiGroupDetailResponse = {
  group: {
    id: '-1001000000001',
    title: 'Alpha Group',
    mode: 'KICK',
    status: 'ACTIVE',
  },
  rule: {
    gateType: 'FT',
    tokenId: 'a'.repeat(64),
    minAmountBase: '1000',
    minNftCount: 0,
    recheckIntervalSec: 120,
    gracePeriodSec: 600,
  },
  members: [
    {
      tgUserId: '1234',
      username: 'alice',
      firstName: 'Alice',
      state: 'VERIFIED_PASS',
      lastBalanceBase: '1220',
      lastCheckedAt: NOW_ISO,
      enforced: 'NONE',
    },
    {
      tgUserId: '5678',
      username: 'bob',
      firstName: 'Bob',
      state: 'VERIFIED_FAIL',
      lastBalanceBase: '20',
      lastCheckedAt: NOW_ISO,
      enforced: 'KICKED',
    },
  ],
  logs: [
    { type: 'VERIFY_SUCCESS', tgUserId: '1234', createdAt: NOW_ISO },
    { type: 'GATE_FAIL', tgUserId: '5678', createdAt: NOW_ISO },
  ],
  stats: {},
  filters: { totalCount: 2 },
};
