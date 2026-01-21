import 'dotenv/config';
import { logger } from './util/logger.js';
import { startBot } from './bot/index.js';
import { disconnectPrisma } from './db/client.js';
import { initChainAdapter, shutdownChainAdapter, configureMetadataProvider } from './chain/index.js';
import { startVerifyWorker, stopVerifyWorker } from './verify/worker.js';
import { startJobs, stopJobs } from './jobs/index.js';

async function main() {
  logger.info('BCHubKey starting...');
  logger.info({
    nodeVersion: process.version,
    env: process.env.NODE_ENV ?? 'development',
  });

  try {
    // Configure token metadata provider (optional BCMR lookup)
    const metadataProvider = (process.env.TOKEN_METADATA_PROVIDER ?? 'NONE') as 'PAYTACA_BCMR' | 'NONE';
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
