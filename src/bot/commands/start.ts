import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';

const logger = createChildLogger('bot:cmd:start');

export async function handleStart(ctx: Context) {
  const userId = ctx.from?.id;
  const chatType = ctx.chat?.type;
  const payload = 'startPayload' in ctx ? (ctx.startPayload as string) : undefined;

  logger.info({ userId, chatType, payload }, '/start command received');

  if (chatType !== 'private') {
    // /start in group - ignore or respond minimally
    return;
  }

  // Check if this is a deep link with group verification payload
  if (payload && payload.startsWith('g_')) {
    // Deep link format: g_<groupId>_<setupCode>
    // Will be handled by verification flow in later tickets
    await ctx.reply(
      `Welcome to BCHubKey!\n\nYou're starting verification for a group.\nThis feature is coming soon.`
    );
    logger.info({ userId, payload }, 'Deep link verification flow triggered');
    return;
  }

  // Standard /start in DM
  await ctx.reply(
    `Welcome to BCHubKey!\n\n` +
      `I help manage token-gated Telegram groups using CashTokens.\n\n` +
      `If you're a group admin, add me to your group and run /setup.\n` +
      `If you're verifying for a group, use the deep link provided by the group admin.\n\n` +
      `Commands:\n` +
      `/help - Show available commands\n` +
      `/status - Check your verification status\n` +
      `/privacy - Learn what data we store`
  );
}
