import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { prisma } from '../../db/client.js';
import { createChildLogger } from '../../util/logger.js';
import { createVerifyFlowState, getVerifyFlowState, updateVerifyFlowState } from '../../verify/state.js';

const logger = createChildLogger('bot:cmd:verify');

export async function handleVerifyCommand(ctx: Context) {
  const chatType = ctx.chat?.type;
  const userId = ctx.from?.id;

  logger.info({ userId, chatType }, '/verify command received');

  if (chatType !== 'private') {
    await ctx.reply('Use /verify in a private chat with the bot.');
    return;
  }

  if (!userId) return;

  const tgUserId = userId.toString();
  const currentFlow = getVerifyFlowState(tgUserId);

  if (currentFlow) {
    updateVerifyFlowState(tgUserId, {
      step: 'AWAITING_ADDRESS',
      address: undefined,
      sessionId: undefined,
    });

    await ctx.reply(
      `Verification restarted for *${escapeMarkdown(currentFlow.groupTitle)}*.\n\n` +
        `Please send your BCH address (cashaddr format).`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const pendingSession = await prisma.verifySession.findFirst({
    where: {
      tgUserId,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      group: true,
    },
  });

  if (pendingSession) {
    const gateRule = await prisma.gateRule.findFirst({
      where: { groupId: pendingSession.groupId },
      orderBy: { createdAt: 'desc' },
    });

    if (gateRule && gateRule.verifyAddress) {
      createVerifyFlowState(
        tgUserId,
        pendingSession.groupId,
        pendingSession.group.title,
        gateRule.gateType,
        gateRule.tokenId,
        gateRule.gateType === 'FT' ? (gateRule.minAmountBase ?? '0') : `${gateRule.minNftCount ?? 1}`,
        gateRule.verifyAddress
      );

      updateVerifyFlowState(tgUserId, {
        step: 'AWAITING_TX',
        address: pendingSession.address,
        sessionId: pendingSession.id,
      });

      await ctx.reply(
        `You already have an active verification session for *${escapeMarkdown(pendingSession.group.title)}*.\n\n` +
          `Click one of the buttons below.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback("I've Sent It", 'verify_sent')],
            [Markup.button.callback('Refresh Status', 'verify_refresh')],
            [Markup.button.callback('Cancel', 'verify_cancel')],
          ]),
        }
      );
      return;
    }
  }

  const latestMembership = await prisma.membership.findFirst({
    where: { tgUserId },
    orderBy: { updatedAt: 'desc' },
    include: {
      group: true,
    },
  });

  if (!latestMembership) {
    await ctx.reply(
      `No group context found.\n\n` +
        `Please use the verification deep link shared in your Telegram group.`
    );
    return;
  }

  const gateRule = await prisma.gateRule.findFirst({
    where: { groupId: latestMembership.groupId },
    orderBy: { createdAt: 'desc' },
  });

  if (!gateRule?.verifyAddress) {
    await ctx.reply('This group is not fully configured for verification yet. Contact the group admin.');
    return;
  }

  createVerifyFlowState(
    tgUserId,
    latestMembership.groupId,
    latestMembership.group.title,
    gateRule.gateType,
    gateRule.tokenId,
    gateRule.gateType === 'FT' ? (gateRule.minAmountBase ?? '0') : `${gateRule.minNftCount ?? 1}`,
    gateRule.verifyAddress
  );

  await ctx.reply(
    `Starting verification for *${escapeMarkdown(latestMembership.group.title)}*.\n\n` +
      `Please send your BCH address (cashaddr format).`,
    { parse_mode: 'Markdown' }
  );
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
