import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import { prisma } from '../../db/client.js';
import {
  getVerifyFlowState,
  updateVerifyFlowState,
  deleteVerifyFlowState,
} from '../../verify/state.js';
import {
  createVerifySession,
  getActiveSession,
  formatSessionInstructions,
} from '../../verify/session.js';

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
      await handleProceed(ctx, userId, data[0]);
      break;

    case 'verify_change_address':
      await handleChangeAddress(ctx, userId);
      break;

    case 'verify_sent':
      await handleSentClick(ctx, userId);
      break;

    case 'verify_refresh':
      await handleRefresh(ctx, userId);
      break;

    case 'verify_cancel':
      await handleCancel(ctx, userId, state);
      break;

    default:
      logger.warn({ action, data }, 'Unknown verify action');
  }
}

async function handleProceed(ctx: Context, userId: string, groupId: string | undefined) {
  const state = getVerifyFlowState(userId);

  if (!state || !state.address) {
    await ctx.editMessageText('Session expired. Please use the group link to start again.');
    return;
  }

  const targetGroupId = groupId ?? state.groupId;

  // Load gate rule to get verification parameters
  const gateRule = await prisma.gateRule.findFirst({
    where: { groupId: targetGroupId },
    orderBy: { createdAt: 'desc' },
  });

  if (!gateRule || !gateRule.verifyAddress) {
    await ctx.editMessageText('Configuration error. Please contact the group admin.');
    return;
  }

  // Check for existing active session
  const existingSession = await getActiveSession(userId, targetGroupId);
  if (existingSession) {
    // Show existing session
    updateVerifyFlowState(userId, {
      step: 'AWAITING_TX',
      sessionId: existingSession.id,
    });

    await ctx.editMessageText(formatSessionInstructions(existingSession), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("I've Sent It", 'verify_sent')],
        [Markup.button.callback('Refresh Status', 'verify_refresh')],
        [Markup.button.callback('Cancel', 'verify_cancel')],
      ]),
    });
    return;
  }

  // Create new session
  const result = await createVerifySession({
    tgUserId: userId,
    groupId: targetGroupId,
    address: state.address,
    verifyAddress: gateRule.verifyAddress,
    minSat: gateRule.verifyMinSat,
    maxSat: gateRule.verifyMaxSat,
    expireMinutes: gateRule.verifyExpireMin,
  });

  if (!result.success || !result.session) {
    await ctx.editMessageText(`*Error*\n\n${result.error ?? 'Failed to create session.'}`, {
      parse_mode: 'Markdown',
    });
    return;
  }

  // Update flow state
  updateVerifyFlowState(userId, {
    step: 'AWAITING_TX',
    sessionId: result.session.id,
  });

  // Show instructions
  await ctx.editMessageText(formatSessionInstructions(result.session), {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback("I've Sent It", 'verify_sent')],
      [Markup.button.callback('Refresh Status', 'verify_refresh')],
      [Markup.button.callback('Cancel', 'verify_cancel')],
    ]),
  });

  logger.info(
    { userId, groupId: targetGroupId, sessionId: result.session.id },
    'Verification session created'
  );
}

async function handleChangeAddress(ctx: Context, userId: string) {
  const state = getVerifyFlowState(userId);
  if (!state) {
    await ctx.editMessageText('Session expired. Please use the group link to start again.');
    return;
  }

  // Reset to address input step
  updateVerifyFlowState(userId, {
    step: 'AWAITING_ADDRESS',
    address: undefined,
    sessionId: undefined,
  });

  await ctx.editMessageText(
    `*Change Address*\n\n` +
      `Please send your new BCH address (cashaddr format).\n\n` +
      `Example: \`bitcoincash:qz...\``,
    { parse_mode: 'Markdown' }
  );

  logger.info({ userId }, 'User changing address');
}

async function handleSentClick(ctx: Context, userId: string) {
  const state = getVerifyFlowState(userId);
  if (!state?.sessionId) {
    await ctx.editMessageText('Session expired. Please start again.');
    return;
  }

  // Get session
  const session = await prisma.verifySession.findUnique({
    where: { id: state.sessionId },
  });

  if (!session || session.status !== 'PENDING') {
    await ctx.editMessageText('Session has expired or already been processed. Please start again.');
    return;
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    await prisma.verifySession.update({
      where: { id: session.id },
      data: { status: 'EXPIRED' },
    });
    await ctx.editMessageText('Session has expired. Please start again.');
    return;
  }

  // Update message to show checking status
  await ctx.editMessageText(
    `*Checking for your transaction...*\n\n` +
      `Looking for ${session.amountSat} sats sent to:\n` +
      `\`${session.verificationAddress}\`\n\n` +
      `This will be verified by the polling worker (T-024).\n` +
      `Click Refresh to check again.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Refresh Status', 'verify_refresh')],
        [Markup.button.callback('Cancel', 'verify_cancel')],
      ]),
    }
  );

  updateVerifyFlowState(userId, { step: 'CHECKING' });

  logger.info({ userId, sessionId: session.id }, 'User clicked sent, checking transaction');
}

async function handleRefresh(ctx: Context, userId: string) {
  const state = getVerifyFlowState(userId);
  if (!state?.sessionId) {
    await ctx.editMessageText('Session expired. Please start again.');
    return;
  }

  // Get current session status
  const session = await prisma.verifySession.findUnique({
    where: { id: state.sessionId },
  });

  if (!session) {
    await ctx.editMessageText('Session not found. Please start again.');
    return;
  }

  switch (session.status) {
    case 'SUCCESS':
      await ctx.editMessageText(
        `*Verification Complete!* ✅\n\n` +
          `Your address ownership has been verified.\n` +
          `Transaction: \`${session.txid ?? 'confirmed'}\`\n\n` +
          `Token balance check will run automatically.`,
        { parse_mode: 'Markdown' }
      );
      deleteVerifyFlowState(userId);
      break;

    case 'FAILED':
      await ctx.editMessageText(
        `*Verification Failed* ❌\n\n` +
          `We couldn't verify your address ownership.\n` +
          `The transaction inputs didn't match your claimed address.\n\n` +
          `Please try again with a standard P2PKH wallet.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('Try Again', 'verify_change_address')],
          ]),
        }
      );
      deleteVerifyFlowState(userId);
      break;

    case 'EXPIRED':
      await ctx.editMessageText(
        `*Session Expired* ⏰\n\n` +
          `Your verification session has expired.\n` +
          `Please start again.`,
        { parse_mode: 'Markdown' }
      );
      deleteVerifyFlowState(userId);
      break;

    case 'PENDING':
      if (session.expiresAt < new Date()) {
        await prisma.verifySession.update({
          where: { id: session.id },
          data: { status: 'EXPIRED' },
        });
        await ctx.editMessageText(
          `*Session Expired* ⏰\n\n` +
            `Your verification session has expired.\n` +
            `Please start again.`,
          { parse_mode: 'Markdown' }
        );
        deleteVerifyFlowState(userId);
      } else {
        // Still pending - show instructions again
        await ctx.editMessageText(formatSessionInstructions(session), {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback("I've Sent It", 'verify_sent')],
            [Markup.button.callback('Refresh Status', 'verify_refresh')],
            [Markup.button.callback('Cancel', 'verify_cancel')],
          ]),
        });
      }
      break;
  }

  logger.info({ userId, sessionId: session.id, status: session.status }, 'Status refreshed');
}

async function handleCancel(
  ctx: Context,
  userId: string,
  state: ReturnType<typeof getVerifyFlowState>
) {
  if (state?.sessionId) {
    // Mark session as expired
    await prisma.verifySession.update({
      where: { id: state.sessionId },
      data: { status: 'EXPIRED' },
    });
  }

  deleteVerifyFlowState(userId);

  await ctx.editMessageText(
    'Verification cancelled.\n\nUse the group link to start again when ready.'
  );

  logger.info({ userId }, 'Verification cancelled by user');
}
