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

async function getGroupDetail(groupId: string): Promise<{
  group: GroupDetail;
  rule: GateRuleDetail | null;
  members: MemberDetail[];
  logs: AuditLogEntry[];
} | null> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) return null;

  const rule = await prisma.gateRule.findFirst({
    where: { groupId },
    orderBy: { createdAt: 'desc' },
  });

  const memberships = await prisma.membership.findMany({
    where: { groupId },
    include: {
      user: {
        select: { username: true, firstName: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  const logs = await prisma.auditLog.findMany({
    where: { groupId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

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
      const data = await getGroupDetail(groupId);
      if (!data) {
        res.statusCode = 404;
        res.end(notFoundPage());
        return;
      }
      res.statusCode = 200;
      res.end(groupDetailPage(data.group, data.rule, data.members, data.logs));
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
