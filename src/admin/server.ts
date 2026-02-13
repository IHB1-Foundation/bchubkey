// Admin dashboard JSON API server

import http from 'node:http';
import { URL } from 'node:url';
import { prisma } from '../db/client.js';
import { createChildLogger, isDemoMode } from '../util/logger.js';
import type {
  GroupSummary,
  GroupDetailResponse,
  HealthResponse,
} from './types.js';

const logger = createChildLogger('admin-api');
const startTime = Date.now();

let server: http.Server | null = null;

function getCorsOrigin(): string | null {
  return process.env.ADMIN_CORS_ORIGIN || null;
}

function setCorsHeaders(res: http.ServerResponse): void {
  const origin = getCorsOrigin();
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

function jsonResponse(res: http.ServerResponse, status: number, data: unknown): void {
  setCorsHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

interface MemberQueryParams {
  search?: string;
  state?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

async function getGroupsList(): Promise<GroupSummary[]> {
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { memberships: true },
      },
      memberships: {
        select: { state: true },
      },
    },
  });

  return groups.map((g) => ({
    id: g.id,
    title: g.title,
    mode: g.mode,
    status: g.status,
    memberCount: g._count.memberships,
    passCount: g.memberships.filter((m) => m.state === 'VERIFIED_PASS').length,
    failCount: g.memberships.filter((m) => m.state === 'VERIFIED_FAIL').length,
    createdAt: g.createdAt.toISOString(),
  }));
}

async function getGroupDetail(
  groupId: string,
  queryParams: MemberQueryParams = {}
): Promise<GroupDetailResponse | null> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) return null;

  const rule = await prisma.gateRule.findFirst({
    where: { groupId },
    orderBy: { createdAt: 'desc' },
  });

  const search = queryParams.search?.trim() || '';
  const state = queryParams.state || 'all';
  const sortBy = queryParams.sortBy || 'lastCheckedAt';
  const sortOrder = queryParams.sortOrder || 'desc';
  const page = Math.max(1, queryParams.page || 1);
  const limit = Math.min(100, Math.max(1, queryParams.limit || 20));
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = { groupId };

  if (state && state !== 'all') {
    whereClause.state = state;
  }

  if (search) {
    whereClause.OR = [
      { tgUserId: { contains: search } },
      { user: { username: { contains: search, mode: 'insensitive' } } },
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any = { lastCheckedAt: sortOrder };
  if (sortBy === 'state') {
    orderBy = { state: sortOrder };
  } else if (sortBy === 'tgUserId') {
    orderBy = { tgUserId: sortOrder };
  }

  const totalCount = await prisma.membership.count({
    where: whereClause,
  });

  const memberships = await prisma.membership.findMany({
    where: whereClause,
    include: {
      user: {
        select: { username: true, firstName: true },
      },
    },
    orderBy,
    skip,
    take: limit,
  });

  const allMemberships = await prisma.membership.findMany({
    where: { groupId },
    select: { lastCheckedAt: true },
    orderBy: { lastCheckedAt: 'desc' },
    take: 100,
  });

  const logs = await prisma.auditLog.findMany({
    where: { groupId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const lastRecheckAt = allMemberships.reduce<Date | null>((latest, m) => {
    if (!m.lastCheckedAt) return latest;
    if (!latest) return m.lastCheckedAt;
    return m.lastCheckedAt > latest ? m.lastCheckedAt : latest;
  }, null);

  const enforcementTypes = ['RESTRICT', 'UNRESTRICT', 'KICK'];
  const lastEnforcementLog = logs.find((l) => enforcementTypes.includes(l.type));

  return {
    group: {
      id: group.id,
      title: group.title,
      mode: group.mode,
      status: group.status,
      setupCode: group.setupCode,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    },
    rule: rule
      ? {
          gateType: rule.gateType,
          tokenId: rule.tokenId,
          minAmountBase: rule.minAmountBase,
          minNftCount: rule.minNftCount,
          decimals: rule.decimals,
          recheckIntervalSec: rule.recheckIntervalSec,
          gracePeriodSec: rule.gracePeriodSec,
          actionOnFail: rule.actionOnFail,
          verifyAddress: rule.verifyAddress,
          verifyMinSat: rule.verifyMinSat,
          verifyMaxSat: rule.verifyMaxSat,
        }
      : null,
    members: memberships.map((m) => ({
      tgUserId: m.tgUserId,
      username: m.user.username,
      firstName: m.user.firstName,
      state: m.state,
      lastBalanceBase: m.lastBalanceBase,
      lastCheckedAt: m.lastCheckedAt?.toISOString() ?? null,
      enforced: m.enforced,
    })),
    logs: logs.map((l) => ({
      id: l.id,
      type: l.type,
      tgUserId: l.tgUserId,
      payloadJson: l.payloadJson,
      createdAt: l.createdAt.toISOString(),
    })),
    stats: {
      lastRecheckAt: lastRecheckAt?.toISOString() ?? null,
      lastEnforcementAt: lastEnforcementLog?.createdAt.toISOString() ?? null,
      lastEnforcementType: lastEnforcementLog?.type ?? null,
    },
    filters: {
      search,
      state,
      sortBy,
      sortOrder,
      page,
      limit,
      totalCount,
    },
  };
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    // GET /api/health
    if (pathname === '/api/health' && req.method === 'GET') {
      const health: HealthResponse = {
        status: 'ok',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        demoMode: isDemoMode(),
        timestamp: new Date().toISOString(),
      };
      jsonResponse(res, 200, health);
      return;
    }

    // GET /api/groups
    if (pathname === '/api/groups' && req.method === 'GET') {
      const groups = await getGroupsList();
      jsonResponse(res, 200, { groups });
      return;
    }

    // GET /api/groups/:id
    const groupMatch = pathname.match(/^\/api\/groups\/(-?\d+)$/);
    if (groupMatch && req.method === 'GET') {
      const groupId = groupMatch[1];

      const pageParam = url.searchParams.get('page');
      const limitParam = url.searchParams.get('limit');
      const queryParams: MemberQueryParams = {
        search: url.searchParams.get('search') || undefined,
        state: url.searchParams.get('state') || undefined,
        sortBy: url.searchParams.get('sortBy') || undefined,
        sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
        page: pageParam ? parseInt(pageParam, 10) : undefined,
        limit: limitParam ? parseInt(limitParam, 10) : undefined,
      };

      const data = await getGroupDetail(groupId, queryParams);
      if (!data) {
        jsonResponse(res, 404, { error: 'Group not found' });
        return;
      }
      jsonResponse(res, 200, data);
      return;
    }

    // 404 for all other routes
    jsonResponse(res, 404, { error: 'Not found' });
  } catch (error) {
    logger.error({ error, pathname }, 'API request error');
    jsonResponse(res, 500, { error: 'Internal server error' });
  }
}

export function startDashboard(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (server) {
      logger.warn('API server already running');
      resolve();
      return;
    }

    server = http.createServer((req, res) => {
      handleRequest(req, res).catch((err) => {
        logger.error({ err }, 'Unhandled API error');
        jsonResponse(res, 500, { error: 'Internal server error' });
      });
    });

    server.on('error', (err) => {
      logger.error({ err }, 'API server error');
      reject(err);
    });

    server.listen(port, () => {
      logger.info({ port }, 'Admin JSON API started');
      resolve();
    });
  });
}

export function stopDashboard(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.close(() => {
      logger.info('Admin JSON API stopped');
      server = null;
      resolve();
    });
  });
}
