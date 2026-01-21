import type { Context } from 'telegraf';
import { prisma } from '../../db/client.js';
import { createChildLogger } from '../../util/logger.js';

const logger = createChildLogger('bot:error');

export async function globalErrorHandler(error: unknown, ctx: Context) {
  const userId = ctx.from?.id?.toString();
  const chatId = ctx.chat?.id?.toString();
  const updateType = ctx.updateType;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error(
    {
      error: errorMessage,
      stack: errorStack,
      userId,
      chatId,
      updateType,
    },
    'Unhandled error in bot update handler'
  );

  // Try to log to audit_logs if we have a chat context
  if (chatId) {
    try {
      await prisma.auditLog.create({
        data: {
          groupId: chatId,
          tgUserId: userId,
          type: 'ERROR',
          payloadJson: JSON.stringify({
            error: errorMessage,
            updateType,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } catch (dbError) {
      // If audit log fails, just log it - don't crash
      logger.error({ dbError }, 'Failed to write error to audit log');
    }
  }

  // Try to notify the user that something went wrong
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery('An error occurred. Please try again later.');
    } else if (ctx.chat) {
      await ctx.reply('Sorry, an error occurred while processing your request. Please try again later.');
    }
  } catch {
    // If we can't even reply, just log and move on
    logger.warn('Could not send error message to user');
  }
}
