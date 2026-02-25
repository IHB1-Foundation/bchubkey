// Admin dashboard JSON API server

import http from 'node:http';
import { URL } from 'node:url';
import { prisma } from '../db/client.js';
import { createChildLogger, isDemoMode } from '../util/logger.js';
import {
  isAuthEnabled,
  validateSession,
  authenticateTelegram,
  revokeSession,
  refreshSession,
  type TelegramLoginData,
} from './auth.js';
import { logAdminAudit } from './audit.js';
import type { GroupSummary, GroupDetailResponse, HealthResponse } from './types.js';

const logger = createChildLogger('admin-api');
const startTime = Date.now();
const DEFAULT_ADMIN_CORS_ORIGINS = ['https://bchubkey.com', 'https://www.bchubkey.com'] as const;

let server: http.Server | null = null;

async function checkDatabaseHealth(): Promise<{ ok: boolean; latencyMs?: number }> {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - startedAt };
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return { ok: false };
  }
}

// ── CORS ───────────────────────────────────────────────────────

function getAllowedCorsOrigins(): Set<string> {
  const configured = process.env.ADMIN_CORS_ORIGIN?.trim();
  if (!configured) {
    return new Set(DEFAULT_ADMIN_CORS_ORIGINS);
  }

  const origins = configured
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return origins.length > 0 ? new Set(origins) : new Set(DEFAULT_ADMIN_CORS_ORIGINS);
}

function setCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse): void {
  const requestOrigin = req.headers.origin;
  if (!requestOrigin) {
    return;
  }

  const allowedOrigins = getAllowedCorsOrigins();
  if (allowedOrigins.has(requestOrigin)) {
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

function jsonResponse(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  status: number,
  data: unknown
): void {
  setCorsHeaders(req, res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

// ── Request Body Parser ────────────────────────────────────────

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const MAX_BODY = 16 * 1024; // 16KB max
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ── Auth Middleware ─────────────────────────────────────────────

interface AuthContext {
  adminUserId: string;
  tgUserId: string;
  sessionId: string;
}

const ADMIN_AUDIT_TYPES = [
  'ADMIN_LOGIN',
  'ADMIN_LOGOUT',
  'ADMIN_AUTH_FAIL',
  'ADMIN_AUTHZ_DENY',
  'ADMIN_SESSION_REFRESH',
] as const;

/**
 * Extract and validate auth from request.
 * Returns AuthContext if valid, null otherwise.
 */
async function extractAuth(req: http.IncomingMessage): Promise<AuthContext | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  return validateSession(token);
}

/**
 * Require auth: returns AuthContext or sends 401 and returns null.
 */
async function requireAuth(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<AuthContext | null> {
  if (!isAuthEnabled()) {
    // Auth disabled — return a synthetic context (backward compatible)
    return { adminUserId: '__noauth__', tgUserId: '0', sessionId: '__noauth__' };
  }

  const auth = await extractAuth(req);
  if (!auth) {
    logAdminAudit({
      type: 'ADMIN_AUTH_FAIL',
      payload: { reason: 'missing_or_invalid_token', path: req.url },
    }).catch((err) => {
      logger.debug({ err }, 'Failed to persist ADMIN_AUTH_FAIL audit event');
    });
    jsonResponse(req, res, 401, { error: 'Authentication required' });
    return null;
  }
  return auth;
}

// ── DTO Sanitization ──────────────────────────────────────────

/** Fields to strip from audit log payloads before sending to FE */
const SENSITIVE_PAYLOAD_KEYS = ['setupCode', 'verificationAddress', 'verifyAddress'];

function sanitizeAuditPayload(payloadJson: string): string {
  try {
    const obj = JSON.parse(payloadJson);
    for (const key of SENSITIVE_PAYLOAD_KEYS) {
      if (key in obj) {
        obj[key] = '[redacted]';
      }
    }
    return JSON.stringify(obj);
  } catch {
    return payloadJson;
  }
}

// ── Tenant Authorization ───────────────────────────────────────

/**
 * Check if admin has access to a specific group.
 * Returns the GroupAdmin role if authorized, null if denied.
 */
async function checkGroupAccess(adminUserId: string, groupId: string): Promise<string | null> {
  if (!isAuthEnabled() || adminUserId === '__noauth__') return 'OWNER'; // no-auth fallback

  const ga = await prisma.groupAdmin.findUnique({
    where: {
      groupId_adminUserId: { groupId, adminUserId },
    },
    select: { role: true },
  });

  if (!ga) {
    logger.warn({ adminUserId, groupId }, 'Tenant authorization denied: no GroupAdmin record');
    logAdminAudit({
      type: 'ADMIN_AUTHZ_DENY',
      adminUserId,
      groupId,
      payload: { reason: 'no_group_admin_record' },
    }).catch((err) => {
      logger.debug({ err }, 'Failed to persist ADMIN_AUTHZ_DENY audit event');
    }); // fire and forget
    return null;
  }

  return ga.role;
}

// ── Data Queries ───────────────────────────────────────────────

interface MemberQueryParams {
  search?: string;
  state?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

async function getGroupsList(adminUserId?: string): Promise<GroupSummary[]> {
  // If auth is enabled and we have a real admin, filter to their groups
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (isAuthEnabled() && adminUserId && adminUserId !== '__noauth__') {
    where.groupAdmins = { some: { adminUserId } };
  }

  const groups = await prisma.group.findMany({
    where,
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
    where: {
      groupId,
      type: {
        notIn: [...ADMIN_AUDIT_TYPES],
      },
    },
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
      payloadJson: sanitizeAuditPayload(l.payloadJson),
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

// ── Auth Endpoints ─────────────────────────────────────────────

async function handleAuthTelegram(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const body = await readBody(req);
  let data: TelegramLoginData;
  try {
    data = JSON.parse(body);
  } catch {
    jsonResponse(req, res, 400, { error: 'Invalid JSON body' });
    return;
  }

  if (!data.id || !data.auth_date || !data.hash) {
    jsonResponse(req, res, 400, { error: 'Missing required fields: id, auth_date, hash' });
    return;
  }

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress;
  const ua = req.headers['user-agent'];

  const result = await authenticateTelegram(data, {
    ipAddress: ip,
    userAgent: ua,
  });

  if (!result) {
    jsonResponse(req, res, 401, { error: 'Invalid authentication' });
    return;
  }

  jsonResponse(req, res, 200, {
    token: result.token,
    user: result.adminUser,
  });
}

async function handleAuthRefresh(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const auth = await extractAuth(req);
  if (!auth) {
    jsonResponse(req, res, 401, { error: 'Authentication required' });
    return;
  }

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress;
  const ua = req.headers['user-agent'];

  const result = await refreshSession(auth.adminUserId, auth.sessionId, {
    ipAddress: ip,
    userAgent: ua,
  });

  if (!result) {
    jsonResponse(req, res, 401, { error: 'Session refresh failed' });
    return;
  }

  jsonResponse(req, res, 200, { token: result.token });
}

async function handleAuthLogout(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const auth = await extractAuth(req);
  if (!auth) {
    jsonResponse(req, res, 401, { error: 'Authentication required' });
    return;
  }

  await revokeSession(auth.sessionId, auth.adminUserId);
  jsonResponse(req, res, 200, { ok: true });
}

async function handleAuthMe(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const auth = await extractAuth(req);
  if (!auth) {
    jsonResponse(req, res, 401, { error: 'Authentication required' });
    return;
  }

  const adminUser = await prisma.adminUser.findUnique({
    where: { id: auth.adminUserId },
    select: {
      id: true,
      tgUserId: true,
      username: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
    },
  });

  if (!adminUser) {
    jsonResponse(req, res, 401, { error: 'Admin user not found' });
    return;
  }

  // Fetch group roles
  const groupAdmins = await prisma.groupAdmin.findMany({
    where: { adminUserId: auth.adminUserId },
    include: {
      group: { select: { id: true, title: true } },
    },
  });

  jsonResponse(req, res, 200, {
    user: adminUser,
    groups: groupAdmins.map((ga) => ({
      groupId: ga.group.id,
      title: ga.group.title,
      role: ga.role,
    })),
  });
}

// ── Request Router ─────────────────────────────────────────────

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    // ── Public Endpoints ──────────────────────────

    // GET /api/health (always public)
    if (pathname === '/api/health' && req.method === 'GET') {
      const db = await checkDatabaseHealth();

      if (!db.ok) {
        const degraded: HealthResponse = {
          status: 'degraded',
          db: 'error',
          uptime: Math.floor((Date.now() - startTime) / 1000),
          demoMode: isDemoMode(),
          timestamp: new Date().toISOString(),
          authEnabled: isAuthEnabled(),
        };
        jsonResponse(req, res, 503, degraded);
        return;
      }

      const health: HealthResponse = {
        status: 'ok',
        db: 'ok',
        dbLatencyMs: db.latencyMs,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        demoMode: isDemoMode(),
        timestamp: new Date().toISOString(),
        authEnabled: isAuthEnabled(),
      };
      jsonResponse(req, res, 200, health);
      return;
    }

    // POST /api/auth/telegram (always available)
    if (pathname === '/api/auth/telegram' && req.method === 'POST') {
      await handleAuthTelegram(req, res);
      return;
    }

    // POST /api/auth/refresh
    if (pathname === '/api/auth/refresh' && req.method === 'POST') {
      await handleAuthRefresh(req, res);
      return;
    }

    // POST /api/auth/logout
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      await handleAuthLogout(req, res);
      return;
    }

    // GET /api/auth/me
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      await handleAuthMe(req, res);
      return;
    }

    // ── Protected Endpoints ───────────────────────

    // All endpoints below require auth (when enabled)
    const auth = await requireAuth(req, res);
    if (!auth) return; // 401 already sent

    // GET /api/groups
    if (pathname === '/api/groups' && req.method === 'GET') {
      const groups = await getGroupsList(auth.adminUserId);
      jsonResponse(req, res, 200, { groups });
      return;
    }

    // GET /api/groups/:id
    const groupMatch = pathname.match(/^\/api\/groups\/(-?\d+)$/);
    if (groupMatch && req.method === 'GET') {
      const groupId = groupMatch[1];

      // Tenant authorization: check admin has access to this group
      const role = await checkGroupAccess(auth.adminUserId, groupId);
      if (!role) {
        jsonResponse(req, res, 403, { error: 'Access denied' });
        return;
      }

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
        jsonResponse(req, res, 404, { error: 'Group not found' });
        return;
      }
      jsonResponse(req, res, 200, data);
      return;
    }

    // 404 for all other routes
    jsonResponse(req, res, 404, { error: 'Not found' });
  } catch (error) {
    logger.error({ error, pathname }, 'API request error');
    jsonResponse(req, res, 500, { error: 'Internal server error' });
  }
}

// ── Server Lifecycle ───────────────────────────────────────────

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
        jsonResponse(req, res, 500, { error: 'Internal server error' });
      });
    });

    server.on('error', (err) => {
      logger.error({ err }, 'API server error');
      reject(err);
    });

    server.listen(port, () => {
      logger.info({ port, authEnabled: isAuthEnabled() }, 'Admin JSON API started');
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
