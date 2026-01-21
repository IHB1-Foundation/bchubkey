import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import { createWizardState, getWizardState } from '../wizard/state.js';
import { isGroupAdmin } from '../util/permissions.js';

const logger = createChildLogger('bot:callback:setupWizard');

export async function handleSetupWizardCallback(ctx: Context, data: string[]) {
  const groupId = data[0];
  const userId = ctx.from?.id;

  if (!groupId || !userId) {
    await ctx.answerCbQuery('Invalid request');
    return;
  }

  logger.info({ userId, groupId }, 'Setup wizard callback triggered');

  // Verify user is still an admin of the group
  const isAdmin = await isGroupAdmin(ctx, Number(groupId), userId);
  if (!isAdmin) {
    await ctx.answerCbQuery('You must be an admin of the group to configure it.');
    return;
  }

  // Get group info
  let groupTitle = 'Unknown Group';
  try {
    const chat = await ctx.telegram.getChat(Number(groupId));
    if ('title' in chat) {
      groupTitle = chat.title;
    }
  } catch (error) {
    logger.warn({ error, groupId }, 'Could not fetch group info');
  }

  // Create or update wizard state
  const existingState = getWizardState(userId.toString());
  if (existingState && existingState.groupId === groupId) {
    // Resume existing wizard
    await ctx.answerCbQuery('Resuming setup...');
    await sendWizardStep(ctx, existingState.step);
    return;
  }

  // Create new wizard state
  createWizardState(userId.toString(), groupId, groupTitle);

  await ctx.answerCbQuery('Opening setup wizard...');

  // Send wizard introduction in DM
  try {
    await ctx.telegram.sendMessage(
      userId,
      `*Token Gate Setup Wizard*\n\n` +
        `Setting up gating for: *${escapeMarkdown(groupTitle)}*\n\n` +
        `I'll guide you through the configuration steps.\n` +
        `You can cancel at any time by typing /cancel.\n\n` +
        `Let's start!`,
      {
        parse_mode: 'Markdown',
      }
    );

    // Send first step
    await sendGateTypeStep(ctx, userId);

    logger.info({ userId, groupId, groupTitle }, 'Wizard started in DM');
  } catch (error) {
    logger.error({ error, userId }, 'Failed to send DM to user');

    // User may not have started the bot yet
    await ctx.reply(
      `I couldn't send you a DM. Please start a chat with me first by clicking my username, ` +
        `then try the setup button again.`
    );
  }
}

async function sendWizardStep(ctx: Context, step: string) {
  const userId = ctx.from?.id;
  if (!userId) return;

  switch (step) {
    case 'GATE_TYPE':
      await sendGateTypeStep(ctx, userId);
      break;
    // Other steps will be implemented in T-011
    default:
      await ctx.telegram.sendMessage(
        userId,
        `Continuing from step: ${step}\n\nThis feature is coming soon.`
      );
  }
}

async function sendGateTypeStep(ctx: Context, userId: number) {
  await ctx.telegram.sendMessage(
    userId,
    `*Step 1: Gate Type*\n\n` +
      `What type of CashToken should be required?\n\n` +
      `• *FT (Fungible Token)* - Users need a minimum amount\n` +
      `• *NFT (Non-Fungible Token)* - Users need at least one NFT`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('Fungible Token (FT)', 'wizard_gate_type:FT'),
          Markup.button.callback('NFT', 'wizard_gate_type:NFT'),
        ],
        [Markup.button.callback('Cancel Setup', 'wizard_cancel')],
      ]),
    }
  );
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
