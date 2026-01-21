import { createChildLogger } from '../util/logger.js';

const logger = createChildLogger('bot:config');

export interface BotConfig {
  token: string;
  botUsername: string;
}

export function loadBotConfig(): BotConfig {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const botUsername = process.env.BOT_PUBLIC_NAME;

  if (!token) {
    logger.fatal('TELEGRAM_BOT_TOKEN is not set');
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }

  if (!botUsername) {
    logger.warn('BOT_PUBLIC_NAME is not set - deep links will not work');
  }

  return {
    token,
    botUsername: botUsername ?? '',
  };
}
