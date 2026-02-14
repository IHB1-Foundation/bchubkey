import 'dotenv/config';
import { logger, isDemoMode } from './util/logger.js';
import { validateStartupConfig } from './util/config.js';
import { startBot } from './bot/index.js';
import { disconnectPrisma } from './db/client.js';
import {
  initChainAdapter,
  shutdownChainAdapter,
  configureMetadataProvider,
} from './chain/index.js';
import { startVerifyWorker, stopVerifyWorker } from './verify/worker.js';
import { startJobs, stopJobs } from './jobs/index.js';
import { startDashboard, stopDashboard } from './admin/index.js';

async function main() {
  // Validate configuration before anything else
  const configResult = validateStartupConfig();
  if (!configResult.valid) {
    logger.fatal({ errors: configResult.errors }, 'Invalid configuration — aborting startup');
    process.exit(1);
  }
  // Prominent demo mode indicator at startup
  if (isDemoMode()) {
    logger.info('========================================');
    logger.info('       DEMO MODE ENABLED');
    logger.info('  Fast intervals for live demonstration');
    logger.info('========================================');
  }

  logger.info('BCHubKey starting...');
  logger.info({
    nodeVersion: process.version,
    env: process.env.NODE_ENV ?? 'development',
    demoMode: isDemoMode(),
  });

  try {
    // Configure token metadata provider (optional BCMR lookup)
    const metadataProvider = (process.env.TOKEN_METADATA_PROVIDER ?? 'NONE') as
      | 'PAYTACA_BCMR'
      | 'NONE';
    configureMetadataProvider({
      provider: metadataProvider,
      baseUrl: process.env.PAYTACA_BCMR_BASE_URL ?? 'https://bcmr.paytaca.com/api',
      timeoutMs: parseInt(process.env.METADATA_TIMEOUT_MS ?? '5000', 10),
      maxRetries: parseInt(process.env.METADATA_MAX_RETRIES ?? '2', 10),
    });

    // Initialize chain adapter
    await initChainAdapter();

    // Start the Telegram bot
    await startBot();

    // Start the verification polling worker
    startVerifyWorker();

    // Start scheduled jobs (recheck, grace enforcement, cleanup)
    startJobs();

    // Optionally start admin dashboard
    const adminPort = process.env.ADMIN_PORT ? parseInt(process.env.ADMIN_PORT, 10) : null;
    if (adminPort) {
      await startDashboard(adminPort);
    }

    logger.info('BCHubKey initialized successfully');
  } catch (error) {
    logger.fatal({ error }, 'Failed to start bot');
    await cleanup();
    process.exit(1);
  }
}

async function cleanup() {
  logger.info('Cleaning up resources...');
  try {
    stopJobs();
    stopVerifyWorker();
    await stopDashboard();
    await shutdownChainAdapter();
    await disconnectPrisma();
  } catch (error) {
    logger.error({ error }, 'Error during cleanup');
  }
}

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  await cleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
  await cleanup();
  process.exit(1);
});

main().catch(async (err) => {
  logger.fatal({ err }, 'Fatal error during startup');
  await cleanup();
  process.exit(1);
});
