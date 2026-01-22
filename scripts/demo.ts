#!/usr/bin/env tsx
/**
 * Demo Mode Starter
 *
 * Starts BCHubKey in demo mode with fast intervals for live demonstrations.
 * Usage: npm run demo
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');

// ANSI color codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const MAGENTA = '\x1b[35m';

// Demo mode environment overrides
const DEMO_ENV: Record<string, string> = {
  // Fast intervals for demo
  DEFAULT_RECHECK_INTERVAL_SEC: '60', // 1 minute
  DEFAULT_GRACE_PERIOD_SEC: '30', // 30 seconds
  DEFAULT_VERIFY_EXPIRE_MIN: '5', // 5 minutes

  // Enable admin dashboard
  ADMIN_PORT: '3000',

  // Demo mode flag
  DEMO_MODE: 'true',

  // Shorter polling for faster response
  POLL_INTERVAL_SEC: '10',
};

function printBanner(): void {
  console.log(`
${CYAN}${BOLD}  ____   ____ _   _       _     _  __
 | __ ) / ___| | | |_   _| |__ | |/ /___ _   _
 |  _ \\| |   | |_| | | | | '_ \\| ' // _ \\ | | |
 | |_) | |___|  _  | |_| | |_) | . \\  __/ |_| |
 |____/ \\____|_| |_|\\__,_|_.__/|_|\\_\\___|\\__, |
                                          |___/ ${RESET}
${DIM}  CashTokens-Gated Telegram Group Automation${RESET}
`);
}

function printChecklist(): void {
  console.log(`${BOLD}${MAGENTA}=== DEMO MODE ===${RESET}\n`);

  // Check required env vars
  const envPath = resolve(ROOT_DIR, '.env');
  const hasEnv = existsSync(envPath);

  console.log(`${BOLD}Pre-flight Checklist:${RESET}`);

  if (hasEnv) {
    console.log(`  ${GREEN}[OK]${RESET} .env file found`);
    const envContent = readFileSync(envPath, 'utf-8');

    const hasBotToken = envContent.includes('TELEGRAM_BOT_TOKEN=') &&
      !envContent.match(/TELEGRAM_BOT_TOKEN=\s*$/m) &&
      !envContent.match(/TELEGRAM_BOT_TOKEN=\s*#/);

    const hasBotName = envContent.includes('BOT_PUBLIC_NAME=') &&
      !envContent.match(/BOT_PUBLIC_NAME=\s*$/m);

    if (hasBotToken) {
      console.log(`  ${GREEN}[OK]${RESET} TELEGRAM_BOT_TOKEN set`);
    } else {
      console.log(`  ${RED}[!!]${RESET} TELEGRAM_BOT_TOKEN not set - bot will fail to start`);
    }

    if (hasBotName) {
      console.log(`  ${GREEN}[OK]${RESET} BOT_PUBLIC_NAME set`);
    } else {
      console.log(`  ${YELLOW}[??]${RESET} BOT_PUBLIC_NAME not set - deep links may not work`);
    }
  } else {
    console.log(`  ${RED}[!!]${RESET} .env file not found - copy .env.example to .env`);
  }

  console.log(`\n${BOLD}Demo Settings:${RESET}`);
  console.log(`  ${DIM}Recheck interval:${RESET}  ${DEMO_ENV.DEFAULT_RECHECK_INTERVAL_SEC}s (1 min)`);
  console.log(`  ${DIM}Grace period:${RESET}      ${DEMO_ENV.DEFAULT_GRACE_PERIOD_SEC}s (30 sec)`);
  console.log(`  ${DIM}Verify TTL:${RESET}        ${DEMO_ENV.DEFAULT_VERIFY_EXPIRE_MIN} min`);
  console.log(`  ${DIM}Poll interval:${RESET}     ${DEMO_ENV.POLL_INTERVAL_SEC}s`);
  console.log(`  ${DIM}Admin dashboard:${RESET}   http://localhost:${DEMO_ENV.ADMIN_PORT}`);

  console.log(`\n${BOLD}Demo Tips:${RESET}`);
  console.log(`  ${DIM}1.${RESET} Use /setup in a group to configure token gating`);
  console.log(`  ${DIM}2.${RESET} Share the generated deep link with judges`);
  console.log(`  ${DIM}3.${RESET} Dashboard auto-refreshes every 30s (enable toggle)`);
  console.log(`  ${DIM}4.${RESET} For instant enforcement, set grace period to 0 in setup`);

  console.log(`\n${YELLOW}Press Ctrl+C to stop${RESET}\n`);
  console.log(`${DIM}${'='.repeat(50)}${RESET}\n`);
}

function startApp(): void {
  // Merge demo env with process env
  const env = { ...process.env, ...DEMO_ENV };

  // Start the app using tsx
  const child = spawn('tsx', ['src/index.ts'], {
    cwd: ROOT_DIR,
    env,
    stdio: 'inherit',
  });

  // Handle process signals
  const cleanup = (): void => {
    child.kill('SIGTERM');
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

// Main
printBanner();
printChecklist();
startApp();
