/**
 * Bootstrap script: assign OWNER to existing groups based on audit logs.
 *
 * For each group that has no GroupAdmin records, find the most recent SETUP
 * audit log and register that Telegram user as the group OWNER.
 *
 * Run: npx tsx scripts/bootstrap-admins.ts
 * Dry run: npx tsx scripts/bootstrap-admins.ts --dry-run
 */

import 'dotenv/config';
import { prisma, disconnectPrisma } from '../src/db/client.js';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`=== Bootstrap Admin Ownership ${dryRun ? '(DRY RUN)' : ''} ===\n`);

  // Find groups that have no GroupAdmin records
  const groups = await prisma.group.findMany({
    where: {
      groupAdmins: { none: {} },
    },
    select: { id: true, title: true },
  });

  if (groups.length === 0) {
    console.log('All groups already have admin ownership assigned.');
    return;
  }

  console.log(`Found ${groups.length} group(s) without admin ownership:\n`);

  let assigned = 0;
  let skipped = 0;

  for (const group of groups) {
    // Find the most recent SETUP audit log for this group
    const setupLog = await prisma.auditLog.findFirst({
      where: { groupId: group.id, type: 'SETUP' },
      orderBy: { createdAt: 'desc' },
    });

    if (!setupLog?.tgUserId) {
      console.log(`  [SKIP] Group "${group.title}" (${group.id}): no SETUP audit log with user ID`);
      skipped++;
      continue;
    }

    console.log(
      `  [${dryRun ? 'WOULD ASSIGN' : 'ASSIGN'}] Group "${group.title}" (${group.id}) → TG user ${setupLog.tgUserId}`
    );

    if (!dryRun) {
      const adminUser = await prisma.adminUser.upsert({
        where: { tgUserId: setupLog.tgUserId },
        update: { updatedAt: new Date() },
        create: {
          tgUserId: setupLog.tgUserId,
          authProvider: 'telegram',
        },
      });

      await prisma.groupAdmin.create({
        data: {
          groupId: group.id,
          adminUserId: adminUser.id,
          role: 'OWNER',
        },
      });
    }

    assigned++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Assigned: ${assigned}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Total:    ${groups.length}`);
  if (dryRun) {
    console.log(`\n  Run without --dry-run to apply changes.`);
  }
}

main()
  .catch((err) => {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  })
  .finally(() => disconnectPrisma());
