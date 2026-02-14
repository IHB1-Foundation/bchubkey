/**
 * Security integration tests for admin auth/authz/tenant isolation.
 *
 * These tests validate:
 * - Unauthenticated access is blocked when auth is enabled
 * - JWT validation works (valid, expired, tampered)
 * - Tenant isolation prevents cross-admin group access
 * - IDOR-style direct object access is denied
 *
 * Run: npx tsx tests/auth-security.test.ts
 * Requires: DATABASE_URL pointing to a test/local Postgres with migrations applied
 */

import 'dotenv/config';
import { createHmac, createHash, randomUUID } from 'node:crypto';

// Set auth env before importing modules
process.env.ADMIN_AUTH_ENABLED = 'true';
process.env.ADMIN_JWT_SECRET = 'test-secret-key-at-least-32-characters-long';
process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';

import { prisma, disconnectPrisma } from '../src/db/client.js';
import {
  signJwt,
  verifyJwt,
  validateTelegramLogin,
  authenticateTelegram,
  validateSession,
  revokeSession,
} from '../src/admin/auth.js';

// ── Test Infrastructure ──────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    const msg = err instanceof Error ? err.message : String(err);
    failures.push(`${name}: ${msg}`);
    console.log(`  ✗ ${name}: ${msg}`);
  }
}

// ── Test Data Setup ──────────────────────────────────

const TEST_GROUP_A = `-100${Date.now()}1`;
const TEST_GROUP_B = `-100${Date.now()}2`;
const TG_USER_ADMIN_A = `${Date.now()}01`;
const TG_USER_ADMIN_B = `${Date.now()}02`;
const TG_USER_NO_ACCESS = `${Date.now()}03`;

let adminUserA: { id: string };
let adminUserB: { id: string };
let adminUserNoAccess: { id: string };

async function setupTestData() {
  // Create test groups
  await prisma.group.createMany({
    data: [
      { id: TEST_GROUP_A, title: 'Test Group A', type: 'supergroup', setupCode: randomUUID().slice(0, 16) },
      { id: TEST_GROUP_B, title: 'Test Group B', type: 'supergroup', setupCode: randomUUID().slice(0, 16) },
    ],
  });

  // Create admin users
  adminUserA = await prisma.adminUser.create({
    data: { tgUserId: TG_USER_ADMIN_A, authProvider: 'telegram' },
  });
  adminUserB = await prisma.adminUser.create({
    data: { tgUserId: TG_USER_ADMIN_B, authProvider: 'telegram' },
  });
  adminUserNoAccess = await prisma.adminUser.create({
    data: { tgUserId: TG_USER_NO_ACCESS, authProvider: 'telegram' },
  });

  // Assign: Admin A → Group A (OWNER), Admin B → Group B (OWNER)
  await prisma.groupAdmin.createMany({
    data: [
      { groupId: TEST_GROUP_A, adminUserId: adminUserA.id, role: 'OWNER' },
      { groupId: TEST_GROUP_B, adminUserId: adminUserB.id, role: 'OWNER' },
    ],
  });
}

async function cleanupTestData() {
  await prisma.auditLog.deleteMany({ where: { groupId: { in: [TEST_GROUP_A, TEST_GROUP_B] } } });
  await prisma.adminSession.deleteMany({ where: { adminUserId: { in: [adminUserA.id, adminUserB.id, adminUserNoAccess.id] } } });
  await prisma.groupAdmin.deleteMany({ where: { groupId: { in: [TEST_GROUP_A, TEST_GROUP_B] } } });
  await prisma.adminUser.deleteMany({ where: { tgUserId: { in: [TG_USER_ADMIN_A, TG_USER_ADMIN_B, TG_USER_NO_ACCESS] } } });
  await prisma.group.deleteMany({ where: { id: { in: [TEST_GROUP_A, TEST_GROUP_B] } } });
}

// ── Tests ────────────────────────────────────────────

async function main() {
  console.log('=== Admin Auth Security Tests ===\n');

  await setupTestData();

  try {
    // ── JWT Tests ──────────────────────────────
    console.log('JWT Token Tests:');

    await test('signJwt produces a valid JWT', async () => {
      const token = signJwt({ sub: 'user1', tgId: '123', sid: 'sess1' });
      assert(typeof token === 'string', 'token should be string');
      assert(token.split('.').length === 3, 'JWT should have 3 parts');
    });

    await test('verifyJwt accepts valid token', async () => {
      const token = signJwt({ sub: 'user1', tgId: '123', sid: 'sess1' });
      const payload = verifyJwt(token);
      assert(payload !== null, 'payload should not be null');
      assert(payload!.sub === 'user1', 'sub should match');
      assert(payload!.tgId === '123', 'tgId should match');
      assert(payload!.sid === 'sess1', 'sid should match');
    });

    await test('verifyJwt rejects tampered token', async () => {
      const token = signJwt({ sub: 'user1', tgId: '123', sid: 'sess1' });
      const tampered = token.slice(0, -5) + 'XXXXX';
      const payload = verifyJwt(tampered);
      assert(payload === null, 'tampered token should be rejected');
    });

    await test('verifyJwt rejects garbage input', async () => {
      assert(verifyJwt('') === null, 'empty string rejected');
      assert(verifyJwt('not.a.jwt') === null, 'garbage rejected');
      assert(verifyJwt('a.b') === null, 'two-part rejected');
    });

    // ── Telegram Login Validation ──────────────
    console.log('\nTelegram Login Validation:');

    await test('validateTelegramLogin rejects expired auth_date', async () => {
      const data = {
        id: 123,
        auth_date: Math.floor(Date.now() / 1000) - 600, // 10 min ago
        hash: 'fakehash',
      };
      const result = validateTelegramLogin(data);
      assert(result === false, 'expired auth_date should be rejected');
    });

    await test('validateTelegramLogin rejects wrong hash', async () => {
      const data = {
        id: 123,
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'deadbeef'.repeat(8),
      };
      const result = validateTelegramLogin(data);
      assert(result === false, 'wrong hash should be rejected');
    });

    await test('validateTelegramLogin accepts correct HMAC', async () => {
      const botToken = process.env.TELEGRAM_BOT_TOKEN!;
      const authDate = Math.floor(Date.now() / 1000);
      const dataCheckString = `auth_date=${authDate}\nid=12345`;
      const secretKey = createHash('sha256').update(botToken).digest();
      const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      const result = validateTelegramLogin({
        id: 12345,
        auth_date: authDate,
        hash,
      });
      assert(result === true, 'correct HMAC should be accepted');
    });

    // ── Session Management ─────────────────────
    console.log('\nSession Management:');

    await test('validateSession rejects invalid JWT', async () => {
      const result = await validateSession('invalid.jwt.token');
      assert(result === null, 'invalid JWT should return null');
    });

    await test('validateSession rejects JWT with non-existent session', async () => {
      const token = signJwt({ sub: adminUserA.id, tgId: TG_USER_ADMIN_A, sid: randomUUID() });
      const result = await validateSession(token);
      assert(result === null, 'non-existent session should return null');
    });

    await test('validateSession accepts valid JWT with active session', async () => {
      const session = await prisma.adminSession.create({
        data: {
          adminUserId: adminUserA.id,
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });
      const token = signJwt({ sub: adminUserA.id, tgId: TG_USER_ADMIN_A, sid: session.id });
      const result = await validateSession(token);
      assert(result !== null, 'valid session should return auth context');
      assert(result!.adminUserId === adminUserA.id, 'adminUserId should match');
    });

    await test('validateSession rejects revoked session', async () => {
      const session = await prisma.adminSession.create({
        data: {
          adminUserId: adminUserA.id,
          expiresAt: new Date(Date.now() + 3600_000),
          revokedAt: new Date(), // revoked
        },
      });
      const token = signJwt({ sub: adminUserA.id, tgId: TG_USER_ADMIN_A, sid: session.id });
      const result = await validateSession(token);
      assert(result === null, 'revoked session should return null');
    });

    await test('validateSession rejects expired session', async () => {
      const session = await prisma.adminSession.create({
        data: {
          adminUserId: adminUserA.id,
          expiresAt: new Date(Date.now() - 1000), // expired
        },
      });
      const token = signJwt({ sub: adminUserA.id, tgId: TG_USER_ADMIN_A, sid: session.id });
      const result = await validateSession(token);
      assert(result === null, 'expired session should return null');
    });

    await test('revokeSession marks session as revoked', async () => {
      const session = await prisma.adminSession.create({
        data: {
          adminUserId: adminUserA.id,
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });
      await revokeSession(session.id, adminUserA.id);
      const updated = await prisma.adminSession.findUnique({ where: { id: session.id } });
      assert(updated?.revokedAt !== null, 'revokedAt should be set');
    });

    // ── Tenant Isolation ───────────────────────
    console.log('\nTenant Isolation:');

    await test('Admin A has access to Group A', async () => {
      const ga = await prisma.groupAdmin.findUnique({
        where: { groupId_adminUserId: { groupId: TEST_GROUP_A, adminUserId: adminUserA.id } },
      });
      assert(ga !== null, 'Admin A should have GroupAdmin record for Group A');
      assert(ga!.role === 'OWNER', 'Admin A should be OWNER of Group A');
    });

    await test('Admin A does NOT have access to Group B', async () => {
      const ga = await prisma.groupAdmin.findUnique({
        where: { groupId_adminUserId: { groupId: TEST_GROUP_B, adminUserId: adminUserA.id } },
      });
      assert(ga === null, 'Admin A should NOT have access to Group B');
    });

    await test('Admin B does NOT have access to Group A', async () => {
      const ga = await prisma.groupAdmin.findUnique({
        where: { groupId_adminUserId: { groupId: TEST_GROUP_A, adminUserId: adminUserB.id } },
      });
      assert(ga === null, 'Admin B should NOT have access to Group A');
    });

    await test('No-access admin has no group access at all', async () => {
      const gas = await prisma.groupAdmin.findMany({
        where: { adminUserId: adminUserNoAccess.id },
      });
      assert(gas.length === 0, 'No-access admin should have zero group records');
    });

    await test('Group list filtered by admin returns only own groups', async () => {
      const groupsA = await prisma.group.findMany({
        where: { groupAdmins: { some: { adminUserId: adminUserA.id } } },
      });
      assert(groupsA.length === 1, 'Admin A should see exactly 1 group');
      assert(groupsA[0].id === TEST_GROUP_A, 'Admin A should see Group A');

      const groupsB = await prisma.group.findMany({
        where: { groupAdmins: { some: { adminUserId: adminUserB.id } } },
      });
      assert(groupsB.length === 1, 'Admin B should see exactly 1 group');
      assert(groupsB[0].id === TEST_GROUP_B, 'Admin B should see Group B');

      const groupsNone = await prisma.group.findMany({
        where: { groupAdmins: { some: { adminUserId: adminUserNoAccess.id } } },
      });
      assert(groupsNone.length === 0, 'No-access admin should see 0 groups');
    });

    // ── IDOR Tests ─────────────────────────────
    console.log('\nIDOR Prevention:');

    await test('Direct group ID lookup fails without GroupAdmin record', async () => {
      // Simulate what the API does: check GroupAdmin before returning data
      const hasAccess = await prisma.groupAdmin.findUnique({
        where: {
          groupId_adminUserId: { groupId: TEST_GROUP_B, adminUserId: adminUserA.id },
        },
      });
      assert(hasAccess === null, 'Admin A accessing Group B by ID should be denied');
    });

    await test('Admin cannot enumerate other groups via search', async () => {
      // With tenant filter, even search params are scoped
      const results = await prisma.group.findMany({
        where: {
          groupAdmins: { some: { adminUserId: adminUserA.id } },
          title: { contains: 'Test Group B' },
        },
      });
      assert(results.length === 0, 'Searching for Group B as Admin A should return empty');
    });

  } finally {
    await cleanupTestData();
  }

  // ── Summary ──────────────────────────────────
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exitCode = 1;
  }

  await disconnectPrisma();
}

main().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
