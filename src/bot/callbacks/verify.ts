import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import {
  getVerifyFlowState,
  updateVerifyFlowState,
  deleteVerifyFlowState,
} from '../../verify/state.js';

const logger = createChildLogger('bot:callback:verify');

export async function handleVerifyCallback(ctx: Context, action: string, data: string[]) {
  const userId = ctx.from?.id?.toString();
  if (!userId) {
    await ctx.answerCbQuery('Invalid request');
    return;
  }

  const state = getVerifyFlowState(userId);

  await ctx.answerCbQuery();

  switch (action) {
    case 'verify_proceed':
      if (!state || !state.address) {
        await ctx.editMessageText('Session expired. Please use the group link to start again.');
        return;
      }
      // Will create session in T-022
      await ctx.editMessageText(
        `*Verification Session*\n\n` +
          `This feature is being implemented in the next ticket (T-022).\n\n` +
          `Your address: \`${state.address}\``,
        { parse_mode: 'Markdown' }
      );
      logger.info({ userId, groupId: state.groupId }, 'Proceed to verification clicked');
      break;

    case 'verify_change_address':
      if (!state) {
        await ctx.editMessageText('Session expired. Please use the group link to start again.');
        return;
      }
      // Reset to address input step
      updateVerifyFlowState(userId, {
        step: 'AWAITING_ADDRESS',
        address: undefined,
      });
      await ctx.editMessageText(
        `*Change Address*\n\n` +
          `Please send your new BCH address (cashaddr format).\n\n` +
          `Example: \`bitcoincash:qz...\``,
        { parse_mode: 'Markdown' }
      );
      logger.info({ userId }, 'User changing address');
      break;

    case 'verify_sent':
      // Will be implemented in T-022/T-024
      await ctx.editMessageText('Checking for transaction... (Coming in T-024)');
      break;

    case 'verify_refresh':
      // Will be implemented in T-024
      await ctx.editMessageText('Refreshing status... (Coming in T-024)');
      break;

    case 'verify_cancel':
      if (state) {
        deleteVerifyFlowState(userId);
      }
      await ctx.editMessageText(
        'Verification cancelled.\n\nUse the group link to start again when ready.'
      );
      logger.info({ userId }, 'Verification cancelled by user');
      break;

    default:
      logger.warn({ action, data }, 'Unknown verify action');
  }
}
