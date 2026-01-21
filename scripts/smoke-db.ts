/**
 * Smoke test for Prisma DB operations
 * Run: npx tsx scripts/smoke-db.ts
 */

import 'dotenv/config';
import { prisma, disconnectPrisma } from '../src/db/client.js';
import { randomUUID } from 'crypto';

async function main() {
  console.log('=== Prisma DB Smoke Test ===\n');

  // Generate test IDs
  const testGroupId = '-1001234567890';
  const testUserId = '123456789';
  const testSetupCode = randomUUID().slice(0, 8);

  try {
    // 1. Create a Group
    console.log('1. Creating test group...');
    const group = await prisma.group.create({
      data: {
        id: testGroupId,
        title: 'Test Group',
        type: 'supergroup',
        setupCode: testSetupCode,
      },
    });
    console.log('   Created:', group);

    // 2. Create a GateRule
    console.log('\n2. Creating gate rule...');
    const gateRule = await prisma.gateRule.create({
      data: {
        groupId: testGroupId,
        gateType: 'FT',
        tokenId: 'abc123def456',
        minAmountBase: '1000000000', // 10 tokens with 8 decimals
        decimals: 8,
        recheckIntervalSec: 60,
        gracePeriodSec: 120,
        verifyAddress: 'bitcoincash:qz...',
      },
    });
    console.log('   Created:', gateRule);

    // 3. Create a User
    console.log('\n3. Creating test user...');
    const user = await prisma.user.create({
      data: {
        tgUserId: testUserId,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      },
    });
    console.log('   Created:', user);

    // 4. Create a UserAddress
    console.log('\n4. Creating user address...');
    const address = await prisma.userAddress.create({
      data: {
        tgUserId: testUserId,
        address: 'bitcoincash:qz2jx5sxxt4wy3z6dycknpk55tcy54jqhcw4u52gxf',
        addressType: 'P2PKH',
        verified: true,
        verifiedAt: new Date(),
      },
    });
    console.log('   Created:', address);

    // 5. Create a VerifySession
    console.log('\n5. Creating verify session...');
    const session = await prisma.verifySession.create({
      data: {
        tgUserId: testUserId,
        groupId: testGroupId,
        address: 'bitcoincash:qz2jx5sxxt4wy3z6dycknpk55tcy54jqhcw4u52gxf',
        amountSat: 2345,
        verificationAddress: 'bitcoincash:qz...',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        status: 'PENDING',
      },
    });
    console.log('   Created:', session);

    // 6. Create a Membership
    console.log('\n6. Creating membership...');
    const membership = await prisma.membership.create({
      data: {
        tgUserId: testUserId,
        groupId: testGroupId,
        state: 'VERIFIED_PASS',
        lastBalanceBase: '1500000000',
        lastCheckedAt: new Date(),
      },
    });
    console.log('   Created:', membership);

    // 7. Create an AuditLog
    console.log('\n7. Creating audit log...');
    const auditLog = await prisma.auditLog.create({
      data: {
        groupId: testGroupId,
        tgUserId: testUserId,
        type: 'GATE_PASS',
        payloadJson: JSON.stringify({ balance: '1500000000', threshold: '1000000000' }),
      },
    });
    console.log('   Created:', auditLog);

    // 8. Read with relations
    console.log('\n8. Reading group with relations...');
    const groupWithRelations = await prisma.group.findUnique({
      where: { id: testGroupId },
      include: {
        gateRules: true,
        memberships: true,
        auditLogs: true,
      },
    });
    console.log('   Group:', groupWithRelations?.title);
    console.log('   Gate rules:', groupWithRelations?.gateRules.length);
    console.log('   Memberships:', groupWithRelations?.memberships.length);
    console.log('   Audit logs:', groupWithRelations?.auditLogs.length);

    // 9. Cleanup test data
    console.log('\n9. Cleaning up test data...');
    await prisma.auditLog.deleteMany({ where: { groupId: testGroupId } });
    await prisma.membership.deleteMany({ where: { groupId: testGroupId } });
    await prisma.verifySession.deleteMany({ where: { groupId: testGroupId } });
    await prisma.userAddress.deleteMany({ where: { tgUserId: testUserId } });
    await prisma.gateRule.deleteMany({ where: { groupId: testGroupId } });
    await prisma.user.delete({ where: { tgUserId: testUserId } });
    await prisma.group.delete({ where: { id: testGroupId } });
    console.log('   Cleanup complete');

    console.log('\n=== All smoke tests PASSED ===');
  } catch (error) {
    console.error('\n=== SMOKE TEST FAILED ===');
    console.error(error);
    process.exit(1);
  } finally {
    await disconnectPrisma();
  }
}

main();
