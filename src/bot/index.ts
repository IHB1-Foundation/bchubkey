import { Telegraf } from 'telegraf';
import { loadBotConfig } from './config.js';
import { handleStart } from './commands/start.js';
import { handleHelp } from './commands/help.js';
import { handleSetup } from './commands/setup.js';
import { handleSettings } from './commands/settings.js';
import { handleMembers } from './commands/members.js';
import { handleAudit } from './commands/audit.js';
import { handleExport } from './commands/export.js';
import { handlePause, handleResume } from './commands/pause.js';
import { handleBanfail } from './commands/banfail.js';
import { handleClaim } from './commands/claim.js';
import { handleStatus } from './commands/status.js';
import { handlePrivacy } from './commands/privacy.js';
import { handleLink } from './commands/link.js';
import { handleVerifyCommand } from './commands/verify.js';
import { handleRecheck } from './commands/recheck.js';
import { handleGate } from './commands/gate.js';
import { handleCallbackQuery } from './callbacks/index.js';
import { handleWizardTextInput } from './wizard/handlers.js';
import { handleVerifyTextInput } from '../verify/handlers.js';
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
  telegraf.command('settings', handleSettings);
  telegraf.command('members', handleMembers);
  telegraf.command('audit', handleAudit);
  telegraf.command('export', handleExport);
  telegraf.command('pause', handlePause);
  telegraf.command('resume', handleResume);
  telegraf.command('banfail', handleBanfail);
  telegraf.command('claim', handleClaim);
  telegraf.command('status', handleStatus);
  telegraf.command('privacy', handlePrivacy);
  telegraf.command('link', handleLink);
  telegraf.command('verify', handleVerifyCommand);
  telegraf.command('recheck', handleRecheck);
  telegraf.command('gate', handleGate);

  // Register callback query handler
  telegraf.on('callback_query', handleCallbackQuery);

  // Register text message handler (verification flow first, then wizard)
  telegraf.on('text', async (ctx) => {
    // Try verification flow first
    const handledByVerify = await handleVerifyTextInput(ctx);
    if (handledByVerify) return;

    // Then try wizard flow
    await handleWizardTextInput(ctx);
  });

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
