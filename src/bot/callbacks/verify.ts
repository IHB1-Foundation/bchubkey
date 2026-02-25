import type { Context } from 'telegraf';
import { Markup, Input } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import { prisma } from '../../db/client.js';
import type { VerifySession } from '../../generated/prisma/client.js';
import {
  getVerifyFlowState,
  updateVerifyFlowState,
  deleteVerifyFlowState,
} from '../../verify/state.js';
import {
  createVerifySession,
  getActiveSession,
  formatSessionInstructions,
  formatSessionInstructionsWithQR,
} from '../../verify/session.js';
import { MessageBuilder, ButtonLabels, Messages, truncate } from '../util/messages.js';

const logger = createChildLogger('bot:callback:verify');

const VERIFY_BUTTONS = Markup.inlineKeyboard([
  [Markup.button.callback(ButtonLabels.SENT_IT, 'verify_sent')],
  [Markup.button.callback(ButtonLabels.REFRESH, 'verify_refresh')],
  [Markup.button.callback(ButtonLabels.CANCEL, 'verify_cancel')],
]);

/**
 * Sends session instructions with QR code if available.
 * Falls back to text-only if QR generation fails.
 */
async function sendSessionInstructionsWithQR(ctx: Context, session: VerifySession): Promise<void> {
  try {
    const { text, qrBuffer } = await formatSessionInstructionsWithQR(session);

    if (qrBuffer) {
      // Delete the original message first (edit can't switch to photo)
      try {
        await ctx.deleteMessage();
      } catch {
        // Ignore if message can't be deleted
      }

      // Send QR image with caption
      await ctx.replyWithPhoto(Input.fromBuffer(qrBuffer, 'verification-qr.png'), {
        caption: text,
        parse_mode: 'Markdown',
        ...VERIFY_BUTTONS,
      });
    } else {
      // Fallback: text only
      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...VERIFY_BUTTONS,
      });
    }
  } catch (error) {
    logger.warn({ error, sessionId: session.id }, 'Failed to send QR, falling back to text');
    // Fallback: text only
    await ctx.editMessageText(formatSessionInstructions(session), {
      parse_mode: 'Markdown',
      ...VERIFY_BUTTONS,
    });
  }
}

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

    case 'verify_start_over':
      await handleStartOver(ctx, userId, state);
      break;

    default:
      logger.warn({ action, data }, 'Unknown verify action');
  }
}

async function handleProceed(ctx: Context, userId: string, groupId: string | undefined) {
  const state = getVerifyFlowState(userId);

  if (!state || !state.address) {
    await ctx.editMessageText(Messages.sessionExpired(), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(ButtonLabels.START_OVER, 'verify_start_over')],
      ]),
    });
    return;
  }

  const targetGroupId = groupId ?? state.groupId;

  // Load gate rule to get verification parameters
  const gateRule = await prisma.gateRule.findFirst({
    where: { groupId: targetGroupId },
    orderBy: { createdAt: 'desc' },
  });

  if (!gateRule || !gateRule.verifyAddress) {
    const msg = new MessageBuilder()
      .title('Configuration Error')
      .blank()
      .text('Ownership proof is not properly configured.')
      .blank()
      .action('Contact the group admin.')
      .build();
    await ctx.editMessageText(msg, { parse_mode: 'Markdown' });
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

    await sendSessionInstructionsWithQR(ctx, existingSession);
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
    const msg = new MessageBuilder()
      .title('Error')
      .blank()
      .text(result.error ?? 'Failed to create session.')
      .build();
    await ctx.editMessageText(msg, { parse_mode: 'Markdown' });
    return;
  }

  // Update flow state
  updateVerifyFlowState(userId, {
    step: 'AWAITING_TX',
    sessionId: result.session.id,
  });

  // Show instructions with QR
  await sendSessionInstructionsWithQR(ctx, result.session);

  logger.info(
    { userId, groupId: targetGroupId, sessionId: result.session.id },
    'Verification session created'
  );
}

async function handleChangeAddress(ctx: Context, userId: string) {
  const state = getVerifyFlowState(userId);
  if (!state) {
    await ctx.editMessageText(Messages.sessionExpired(), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(ButtonLabels.START_OVER, 'verify_start_over')],
      ]),
    });
    return;
  }

  // Reset to address input step
  updateVerifyFlowState(userId, {
    step: 'AWAITING_ADDRESS',
    address: undefined,
    sessionId: undefined,
  });

  const msg = new MessageBuilder()
    .title('Change Address')
    .blank()
    .text('Please send your new BCH address (cashaddr format).')
    .blank()
    .code('bitcoincash:qz...')
    .build();

  await ctx.editMessageText(msg, { parse_mode: 'Markdown' });

  logger.info({ userId }, 'User changing address');
}

async function handleSentClick(ctx: Context, userId: string) {
  const state = getVerifyFlowState(userId);
  if (!state?.sessionId) {
    await ctx.editMessageText(Messages.sessionExpired(), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(ButtonLabels.START_OVER, 'verify_start_over')],
      ]),
    });
    return;
  }

  // Get session
  const session = await prisma.verifySession.findUnique({
    where: { id: state.sessionId },
  });

  if (!session || session.status !== 'PENDING') {
    await ctx.editMessageText(Messages.sessionExpired(), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(ButtonLabels.START_OVER, 'verify_start_over')],
      ]),
    });
    return;
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    await prisma.verifySession.update({
      where: { id: session.id },
      data: { status: 'EXPIRED' },
    });
    await ctx.editMessageText(Messages.sessionExpired(), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(ButtonLabels.START_OVER, 'verify_start_over')],
      ]),
    });
    return;
  }

  // Update message to show checking status
  const msg = new MessageBuilder()
    .title('Checking Transaction')
    .blank()
    .text(`Looking for ${session.amountSat} sats sent to:`)
    .code(truncate(session.verificationAddress, 40))
    .blank()
    .text('The polling worker will verify your transaction.')
    .blank()
    .action('Click Refresh to check status.')
    .build();

  await ctx.editMessageText(msg, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback(ButtonLabels.REFRESH, 'verify_refresh')],
      [Markup.button.callback(ButtonLabels.CANCEL, 'verify_cancel')],
    ]),
  });

  updateVerifyFlowState(userId, { step: 'CHECKING' });

  logger.info({ userId, sessionId: session.id }, 'User clicked sent, checking transaction');
}

async function handleRefresh(ctx: Context, userId: string) {
  const state = getVerifyFlowState(userId);
  if (!state?.sessionId) {
    await ctx.editMessageText(Messages.sessionExpired(), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(ButtonLabels.START_OVER, 'verify_start_over')],
      ]),
    });
    return;
  }

  // Get current session status
  const session = await prisma.verifySession.findUnique({
    where: { id: state.sessionId },
  });

  if (!session) {
    await ctx.editMessageText(Messages.sessionExpired(), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(ButtonLabels.START_OVER, 'verify_start_over')],
      ]),
    });
    return;
  }

  switch (session.status) {
    case 'SUCCESS':
      await ctx.editMessageText(Messages.verificationSuccess(session.txid ?? undefined), {
        parse_mode: 'Markdown',
      });
      deleteVerifyFlowState(userId);
      break;

    case 'FAILED':
      await ctx.editMessageText(Messages.verificationFailed(), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(ButtonLabels.START_OVER, 'verify_start_over')],
        ]),
      });
      // Keep state for restart capability
      break;

    case 'EXPIRED':
      await ctx.editMessageText(Messages.sessionExpired(), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(ButtonLabels.START_OVER, 'verify_start_over')],
        ]),
      });
      // Keep state for restart capability
      break;

    case 'PENDING':
      if (session.expiresAt < new Date()) {
        await prisma.verifySession.update({
          where: { id: session.id },
          data: { status: 'EXPIRED' },
        });
        await ctx.editMessageText(Messages.sessionExpired(), {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(ButtonLabels.START_OVER, 'verify_start_over')],
          ]),
        });
        // Keep state for restart capability
      } else {
        // Still pending - show instructions again
        await ctx.editMessageText(formatSessionInstructions(session), {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(ButtonLabels.SENT_IT, 'verify_sent')],
            [Markup.button.callback(ButtonLabels.REFRESH, 'verify_refresh')],
            [Markup.button.callback(ButtonLabels.CANCEL, 'verify_cancel')],
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

  await ctx.editMessageText(Messages.verificationCancelled(), { parse_mode: 'Markdown' });

  logger.info({ userId }, 'Verification cancelled by user');
}

async function handleStartOver(
  ctx: Context,
  userId: string,
  state: ReturnType<typeof getVerifyFlowState>
) {
  // If we have state with groupId, we can restart directly
  if (state?.groupId) {
    // Reset to address input step
    updateVerifyFlowState(userId, {
      step: 'AWAITING_ADDRESS',
      address: undefined,
      sessionId: undefined,
    });

    const msg = new MessageBuilder()
      .step(1, 3, 'Submit Address')
      .blank()
      .field('Group', state.groupTitle)
      .blank()
      .text('Please send your BCH address (cashaddr format) to begin verification.')
      .blank()
      .code('bitcoincash:qz...')
      .build();

    await ctx.editMessageText(msg, { parse_mode: 'Markdown' });

    logger.info({ userId, groupId: state.groupId }, 'User restarting verification');
    return;
  }

  // No state - tell user to use group link
  deleteVerifyFlowState(userId);

  const msg = new MessageBuilder()
    .title('Start New Verification')
    .blank()
    .text('Your session has ended.')
    .blank()
    .action('Use the verification link from the group to start again.')
    .build();

  await ctx.editMessageText(msg, { parse_mode: 'Markdown' });

  logger.info({ userId }, 'User requested start over but no group context');
}
