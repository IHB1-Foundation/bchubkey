import 'dotenv/config';
import { logger } from './util/logger.js';
import { startBot } from './bot/index.js';
import { disconnectPrisma } from './db/client.js';

async function main() {
  logger.info('BCHubKey starting...');
  logger.info({
    nodeVersion: process.version,
    env: process.env.NODE_ENV ?? 'development',
  });

  try {
    // Start the Telegram bot
    await startBot();

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
