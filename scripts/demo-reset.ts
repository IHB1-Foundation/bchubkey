#!/usr/bin/env tsx
/**
 * Demo Reset Script
 *
 * Resets the database and optionally seeds sample data for demo.
 * Usage: npm run demo:reset
 *
 * WARNING: This will delete all existing data!
 */

import 'dotenv/config';
import { prisma, disconnectPrisma } from '../src/db/client.js';
import { createInterface } from 'node:readline';

// ANSI color codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${YELLOW}${message} (y/N): ${RESET}`, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function resetDatabase(): Promise<void> {
  console.log(`\n${BOLD}${RED}DATABASE RESET${RESET}\n`);
  console.log(`${DIM}This will delete ALL data from the database.${RESET}`);
  console.log(`${DIM}Tables affected: audit_logs, verify_sessions, memberships, user_addresses, gate_rules, groups, users${RESET}\n`);

  const confirmed = await confirm('Are you sure you want to continue?');

  if (!confirmed) {
    console.log(`\n${YELLOW}Aborted.${RESET}\n`);
    return;
  }

  console.log(`\n${CYAN}Resetting database...${RESET}`);

  // Delete in order of dependencies
  await prisma.auditLog.deleteMany({});
  console.log(`  ${GREEN}[OK]${RESET} Deleted audit_logs`);

  await prisma.verifySession.deleteMany({});
  console.log(`  ${GREEN}[OK]${RESET} Deleted verify_sessions`);

  await prisma.membership.deleteMany({});
  console.log(`  ${GREEN}[OK]${RESET} Deleted memberships`);

  await prisma.userAddress.deleteMany({});
  console.log(`  ${GREEN}[OK]${RESET} Deleted user_addresses`);

  await prisma.gateRule.deleteMany({});
  console.log(`  ${GREEN}[OK]${RESET} Deleted gate_rules`);

  await prisma.group.deleteMany({});
  console.log(`  ${GREEN}[OK]${RESET} Deleted groups`);

  await prisma.user.deleteMany({});
  console.log(`  ${GREEN}[OK]${RESET} Deleted users`);

  console.log(`\n${GREEN}${BOLD}Database reset complete!${RESET}\n`);
}

async function seedSampleData(): Promise<void> {
  console.log(`\n${BOLD}${CYAN}SEED SAMPLE DATA${RESET}\n`);
  console.log(`${DIM}This will create a sample group and gate rule for demo purposes.${RESET}`);
  console.log(`${DIM}You'll still need to set up the actual Telegram bot and group.${RESET}\n`);

  const confirmed = await confirm('Do you want to seed sample data?');

  if (!confirmed) {
    console.log(`\n${YELLOW}Skipped seeding.${RESET}\n`);
    return;
  }

  console.log(`\n${CYAN}Seeding sample data...${RESET}`);

  // Create a sample group (negative ID as Telegram uses negative IDs for groups)
  const sampleGroupId = '-1001234567890';
  const setupCode = Math.random().toString(36).substring(2, 10);

  await prisma.group.upsert({
    where: { id: sampleGroupId },
    update: {},
    create: {
      id: sampleGroupId,
      title: 'Demo Token Holders',
      type: 'supergroup',
      setupCode,
      mode: 'RESTRICT',
      status: 'ACTIVE',
    },
  });
  console.log(`  ${GREEN}[OK]${RESET} Created sample group`);

  // Create a sample gate rule
  await prisma.gateRule.create({
    data: {
      groupId: sampleGroupId,
      gateType: 'FT',
      tokenId: '0000000000000000000000000000000000000000000000000000000000000000',
      minAmountBase: '1000000',
      minNftCount: null,
      decimals: 6,
      recheckIntervalSec: 60,
      gracePeriodSec: 30,
      actionOnFail: 'RESTRICT',
      verifyAddress: 'bchtest:qz2708...',
      verifyMinSat: 2000,
      verifyMaxSat: 2999,
      verifyExpireMin: 5,
    },
  });
  console.log(`  ${GREEN}[OK]${RESET} Created sample gate rule`);

  // Create a sample audit log
  await prisma.auditLog.create({
    data: {
      groupId: sampleGroupId,
      tgUserId: null,
      type: 'SETUP',
      payloadJson: JSON.stringify({ message: 'Demo group configured', setupCode }),
    },
  });
  console.log(`  ${GREEN}[OK]${RESET} Created sample audit log`);

  console.log(`\n${GREEN}${BOLD}Sample data seeded!${RESET}`);
  console.log(`\n${DIM}Note: The sample group ID (${sampleGroupId}) is placeholder.${RESET}`);
  console.log(`${DIM}You need to set up a real Telegram group and run /setup to use.${RESET}\n`);
}

async function main(): Promise<void> {
  console.log(`
${CYAN}${BOLD}BCHubKey Demo Reset${RESET}
${DIM}${'='.repeat(40)}${RESET}
`);

  try {
    await resetDatabase();
    await seedSampleData();
  } catch (error) {
    console.error(`\n${RED}Error:${RESET}`, error);
    process.exit(1);
  } finally {
    await disconnectPrisma();
  }
}

main();
