import 'dotenv/config';
import { logger, isDemoMode } from './util/logger.js';
import { validateStartupConfig } from './util/config.js';
import { startBot, stopBot } from './bot/index.js';
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
  // Optionally start admin JSON API (Railway PORT fallback)
  const adminPortRaw = process.env.ADMIN_PORT ?? process.env.PORT;
  const adminPort = adminPortRaw ? parseInt(adminPortRaw, 10) : null;

  // Validate configuration before anything else
  const configResult = validateStartupConfig();
  if (!configResult.valid) {
    // Keep API service available when only bot token is missing.
    // This allows /api/health and admin endpoints to stay reachable during setup.
    const nonFatalErrors: string[] =
      adminPort !== null
        ? configResult.errors.filter((e) => e === 'TELEGRAM_BOT_TOKEN is required')
        : [];
    const fatalErrors = configResult.errors.filter((e) => !nonFatalErrors.includes(e));

    if (fatalErrors.length > 0) {
      logger.fatal({ errors: fatalErrors }, 'Invalid configuration — aborting startup');
      process.exit(1);
    }

    if (nonFatalErrors.length > 0) {
      logger.warn(
        { errors: nonFatalErrors },
        'Continuing startup in degraded mode (admin API only)'
      );
    }
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

    if (adminPort) {
      await startDashboard(adminPort);
    }

    let chainReady = false;

    // Initialize chain adapter (degraded mode on failure)
    try {
      await initChainAdapter();
      chainReady = true;
    } catch (error) {
      logger.error({ error }, 'Chain adapter init failed; API will stay up in degraded mode');
    }

    // Start the Telegram bot in background.
    // Keep API and jobs available even if Telegram long-polling is delayed.
    startBot()
      .then(() => {
        logger.info('Bot launch completed');
      })
      .catch((error) => {
        logger.error({ error }, 'Bot launch failed; API will stay up in degraded mode');
      });

    if (chainReady) {
      // Start the verification polling worker
      startVerifyWorker();

      // Start scheduled jobs (recheck, grace enforcement, cleanup)
      startJobs();
    } else {
      logger.warn('Skipping verify worker/jobs because chain adapter is not ready');
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
    await stopBot();
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
