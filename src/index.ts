import 'dotenv/config';
import { logger } from './util/logger.js';

async function main() {
  logger.info('BCHubKey starting...');
  logger.info({
    nodeVersion: process.version,
    env: process.env.NODE_ENV ?? 'development',
  });

  // Placeholder: bot initialization will go here
  logger.info('BCHubKey initialized successfully');

  // Keep process alive for development (will be replaced by bot polling)
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down...');
    process.exit(0);
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal error during startup');
  process.exit(1);
});
