import { Telegraf } from 'telegraf';
import { loadBotConfig } from './config.js';
import { handleStart } from './commands/start.js';
import { handleHelp } from './commands/help.js';
import { handleSetup } from './commands/setup.js';
import { handleCallbackQuery } from './callbacks/index.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import { createChildLogger } from '../util/logger.js';

const logger = createChildLogger('bot');

let bot: Telegraf | null = null;

export function createBot(): Telegraf {
  const config = loadBotConfig();

  logger.info('Creating Telegraf bot instance');

  const telegraf = new Telegraf(config.token);

  // Register global error handler
  telegraf.catch(globalErrorHandler);

  // Register commands
  telegraf.start(handleStart);
  telegraf.help(handleHelp);
  telegraf.command('setup', handleSetup);

  // Register callback query handler
  telegraf.on('callback_query', handleCallbackQuery);

  logger.info('Bot handlers registered');

  return telegraf;
}

export async function startBot(): Promise<Telegraf> {
  if (bot) {
    logger.warn('Bot already started');
    return bot;
  }

  bot = createBot();

  // Enable graceful stop
  const stopSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  stopSignals.forEach((signal) => {
    process.once(signal, () => {
      logger.info({ signal }, 'Received stop signal, stopping bot...');
      bot?.stop(signal);
    });
  });

  logger.info('Starting bot with long polling...');
  await bot.launch();
  logger.info('Bot started successfully');

  return bot;
}

export async function stopBot(): Promise<void> {
  if (!bot) {
    return;
  }

  logger.info('Stopping bot...');
  bot.stop();
  bot = null;
  logger.info('Bot stopped');
}

export function getBot(): Telegraf | null {
  return bot;
}
