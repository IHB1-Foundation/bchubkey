// Admin authentication: Telegram Login validation + JWT token management

import { createHmac, createHash } from 'node:crypto';
import { prisma } from '../db/client.js';
import { createChildLogger } from '../util/logger.js';

const logger = createChildLogger('admin:auth');

// ── Configuration ──────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error('ADMIN_JWT_SECRET is required when auth is enabled');
  return secret;
}

function getSessionTtlSec(): number {
  return parseInt(process.env.ADMIN_SESSION_TTL_SEC ?? '86400', 10);
}

export function isAuthEnabled(): boolean {
  return process.env.ADMIN_AUTH_ENABLED === 'true';
}

// ── Telegram Login Validation ──────────────────────────────────

export interface TelegramLoginData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Validate Telegram Login Widget data using HMAC-SHA256.
 * See: https://core.telegram.org/widgets/login#checking-authorization
 */
export function validateTelegramLogin(data: TelegramLoginData): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    logger.error('TELEGRAM_BOT_TOKEN not set, cannot validate Telegram Login');
    return false;
  }

  // Check auth_date is within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (now - data.auth_date > 300) {
    logger.warn({ authDate: data.auth_date, now }, 'Telegram Login auth_date too old');
    return false;
  }

  // Build data_check_string: sorted key=value pairs excluding 'hash'
  const checkData: Record<string, string> = {};
  if (data.id !== undefined) checkData['id'] = String(data.id);
  if (data.first_name) checkData['first_name'] = data.first_name;
  if (data.last_name) checkData['last_name'] = data.last_name;
  if (data.username) checkData['username'] = data.username;
  if (data.photo_url) checkData['photo_url'] = data.photo_url;
  if (data.auth_date !== undefined) checkData['auth_date'] = String(data.auth_date);

  const dataCheckString = Object.keys(checkData)
    .sort()
    .map((k) => `${k}=${checkData[k]}`)
    .join('\n');

  const secretKey = createHash('sha256').update(botToken).digest();
  const hmac = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return hmac === data.hash;
}

// ── JWT (HS256, built-in crypto) ───────────────────────────────

interface JwtPayload {
  sub: string; // admin_user_id
  tgId: string; // telegram user id
  sid: string; // session id
  iat: number;
  exp: number;
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function base64UrlDecode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}

export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + getSessionTtlSec(),
  };

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const secret = getJwtSecret();
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSig = createHmac('sha256', secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    // Constant-time comparison
    if (signature.length !== expectedSig.length) return null;
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSig);
    if (!a.equals(b)) return null;

    const payload: JwtPayload = JSON.parse(base64UrlDecode(body));

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return null;

    return payload;
  } catch {
    return null;
  }
}

// ── Session Management ─────────────────────────────────────────

export interface AuthResult {
  token: string;
  adminUser: {
    id: string;
    tgUserId: string;
    username: string | null;
    firstName: string | null;
  };
}

/**
 * Authenticate via Telegram Login data: validate, upsert admin user, create session, return JWT.
 */
export async function authenticateTelegram(
  data: TelegramLoginData,
  meta?: { ipAddress?: string; userAgent?: string }
): Promise<AuthResult | null> {
  if (!validateTelegramLogin(data)) {
    logger.warn({ tgId: data.id }, 'Invalid Telegram Login signature');
    return null;
  }

  const tgUserId = String(data.id);

  // Upsert admin user
  const adminUser = await prisma.adminUser.upsert({
    where: { tgUserId },
    update: {
      username: data.username ?? null,
      firstName: data.first_name ?? null,
      lastName: data.last_name ?? null,
      photoUrl: data.photo_url ?? null,
      updatedAt: new Date(),
    },
    create: {
      tgUserId,
      username: data.username ?? null,
      firstName: data.first_name ?? null,
      lastName: data.last_name ?? null,
      photoUrl: data.photo_url ?? null,
      authProvider: 'telegram',
    },
  });

  // Create session
  const session = await prisma.adminSession.create({
    data: {
      adminUserId: adminUser.id,
      expiresAt: new Date(Date.now() + getSessionTtlSec() * 1000),
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    },
  });

  const token = signJwt({
    sub: adminUser.id,
    tgId: adminUser.tgUserId,
    sid: session.id,
  });

  logger.info({ adminUserId: adminUser.id, tgUserId }, 'Admin authenticated via Telegram Login');

  return {
    token,
    adminUser: {
      id: adminUser.id,
      tgUserId: adminUser.tgUserId,
      username: adminUser.username,
      firstName: adminUser.firstName,
    },
  };
}

/**
 * Validate JWT and check that the session is still active (not revoked, not expired).
 */
export async function validateSession(
  token: string
): Promise<{ adminUserId: string; tgUserId: string; sessionId: string } | null> {
  const payload = verifyJwt(token);
  if (!payload) return null;

  const session = await prisma.adminSession.findUnique({
    where: { id: payload.sid },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt <= new Date()) return null;
  if (session.adminUserId !== payload.sub) return null;

  return {
    adminUserId: payload.sub,
    tgUserId: payload.tgId,
    sessionId: payload.sid,
  };
}

/**
 * Revoke a session (logout).
 */
export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.adminSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

/**
 * Refresh: revoke old session, create new one, return new JWT.
 */
export async function refreshSession(
  adminUserId: string,
  oldSessionId: string,
  meta?: { ipAddress?: string; userAgent?: string }
): Promise<{ token: string; sessionId: string } | null> {
  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
  });
  if (!adminUser) return null;

  // Revoke old session
  await revokeSession(oldSessionId);

  // Create new session
  const session = await prisma.adminSession.create({
    data: {
      adminUserId,
      expiresAt: new Date(Date.now() + getSessionTtlSec() * 1000),
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    },
  });

  const token = signJwt({
    sub: adminUser.id,
    tgId: adminUser.tgUserId,
    sid: session.id,
  });

  return { token, sessionId: session.id };
}
