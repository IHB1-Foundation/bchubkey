// Admin dashboard HTTP server (read-only)

import http from 'node:http';
import { URL } from 'node:url';
import { prisma } from '../db/client.js';
import { createChildLogger } from '../util/logger.js';
import {
  groupsListPage,
  groupDetailPage,
  notFoundPage,
  errorPage,
  type GroupSummary,
  type GroupDetail,
  type GateRuleDetail,
  type MemberDetail,
  type AuditLogEntry,
  type GroupStats,
  type MemberFilters,
} from './templates.js';

const logger = createChildLogger('admin-dashboard');

let server: http.Server | null = null;

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
    createdAt: g.createdAt,
  }));
}

interface MemberQueryParams {
  search?: string;
  state?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

async function getGroupDetail(
  groupId: string,
  queryParams: MemberQueryParams = {}
): Promise<{
  group: GroupDetail;
  rule: GateRuleDetail | null;
  members: MemberDetail[];
  logs: AuditLogEntry[];
  stats: GroupStats;
  filters: MemberFilters;
} | null> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) return null;

  const rule = await prisma.gateRule.findFirst({
    where: { groupId },
    orderBy: { createdAt: 'desc' },
  });

  // Parse and validate query params
  const search = queryParams.search?.trim() || '';
  const state = queryParams.state || 'all';
  const sortBy = queryParams.sortBy || 'lastCheckedAt';
  const sortOrder = queryParams.sortOrder || 'desc';
  const page = Math.max(1, queryParams.page || 1);
  const limit = Math.min(100, Math.max(1, queryParams.limit || 20));
  const skip = (page - 1) * limit;

  // Build where clause for memberships
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = { groupId };

  // State filter
  if (state && state !== 'all') {
    whereClause.state = state;
  }

  // Search filter (user ID or username)
  if (search) {
    whereClause.OR = [
      { tgUserId: { contains: search } },
      { user: { username: { contains: search, mode: 'insensitive' } } },
    ];
  }

  // Build orderBy clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any = { lastCheckedAt: sortOrder };
  if (sortBy === 'state') {
    orderBy = { state: sortOrder };
  } else if (sortBy === 'tgUserId') {
    orderBy = { tgUserId: sortOrder };
  }

  // Get total count for pagination
  const totalCount = await prisma.membership.count({
    where: whereClause,
  });

  // Fetch memberships with filters
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

  // Fetch all memberships for stats (unfiltered, but limited)
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

  // Compute stats from all memberships (not filtered)
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
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
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
      lastCheckedAt: m.lastCheckedAt,
      enforced: m.enforced,
    })),
    logs: logs.map((l) => ({
      id: l.id,
      type: l.type,
      tgUserId: l.tgUserId,
      payloadJson: l.payloadJson,
      createdAt: l.createdAt,
    })),
    stats: {
      lastRecheckAt,
      lastEnforcementAt: lastEnforcementLog?.createdAt ?? null,
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

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  try {
    // Route: GET /
    if (pathname === '/' && req.method === 'GET') {
      const groups = await getGroupsList();
      res.statusCode = 200;
      res.end(groupsListPage(groups));
      return;
    }

    // Route: GET /groups/:id
    const groupMatch = pathname.match(/^\/groups\/(-?\d+)$/);
    if (groupMatch && req.method === 'GET') {
      const groupId = groupMatch[1];

      // Parse query params for member filtering
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
        res.statusCode = 404;
        res.end(notFoundPage());
        return;
      }
      res.statusCode = 200;
      res.end(groupDetailPage(data.group, data.rule, data.members, data.logs, data.stats, data.filters));
      return;
    }

    // 404 for all other routes
    res.statusCode = 404;
    res.end(notFoundPage());
  } catch (error) {
    logger.error({ error, pathname }, 'Dashboard request error');
    res.statusCode = 500;
    res.end(errorPage('Internal server error'));
  }
}

export function startDashboard(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (server) {
      logger.warn('Dashboard already running');
      resolve();
      return;
    }

    server = http.createServer((req, res) => {
      handleRequest(req, res).catch((err) => {
        logger.error({ err }, 'Unhandled dashboard error');
        res.statusCode = 500;
        res.end(errorPage('Internal server error'));
      });
    });

    server.on('error', (err) => {
      logger.error({ err }, 'Dashboard server error');
      reject(err);
    });

    server.listen(port, () => {
      logger.info({ port }, 'Admin dashboard started');
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
      logger.info('Admin dashboard stopped');
      server = null;
      resolve();
    });
  });
}
