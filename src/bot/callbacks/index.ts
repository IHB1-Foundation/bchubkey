import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import { handleSetupWizardCallback } from './setupWizard.js';
import { handleWizardCallback } from '../wizard/handlers.js';

const logger = createChildLogger('bot:callbacks');

export type CallbackAction =
  | 'setup_wizard'
  | 'wizard_gate_type'
  | 'wizard_mode'
  | 'wizard_action'
  | 'wizard_confirm'
  | 'wizard_cancel'
  | 'wizard_use_defaults'
  | 'verify_sent'
  | 'verify_refresh'
  | 'verify_cancel'
  | 'noop';

export interface ParsedCallback {
  action: CallbackAction;
  data: string[];
}

export function parseCallbackData(data: string): ParsedCallback {
  const parts = data.split(':');
  const action = (parts[0] ?? 'noop') as CallbackAction;
  return {
    action,
    data: parts.slice(1),
  };
}

export async function handleCallbackQuery(ctx: Context) {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
    return;
  }

  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;

  logger.info({ userId, data }, 'Callback query received');

  const parsed = parseCallbackData(data);

  try {
    switch (parsed.action) {
      case 'setup_wizard':
        await handleSetupWizardCallback(ctx, parsed.data);
        break;

      case 'wizard_gate_type':
      case 'wizard_mode':
      case 'wizard_action':
      case 'wizard_confirm':
      case 'wizard_cancel':
      case 'wizard_use_defaults':
        await handleWizardCallback(ctx, parsed.action, parsed.data);
        break;

      case 'verify_sent':
        // Will be implemented in T-022
        await ctx.answerCbQuery('Verification check coming soon!');
        break;

      case 'verify_refresh':
        // Will be implemented in T-022
        await ctx.answerCbQuery('Refreshing...');
        break;

      case 'verify_cancel':
        // Will be implemented in T-022
        await ctx.answerCbQuery('Verification cancelled');
        break;

      case 'noop':
      default:
        await ctx.answerCbQuery();
        break;
    }
  } catch (error) {
    logger.error({ error, userId, data }, 'Error handling callback query');
    await ctx.answerCbQuery('An error occurred. Please try again.');
  }
}
