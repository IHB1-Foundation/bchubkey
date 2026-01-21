import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import { prisma } from '../../db/client.js';
import { createVerifyFlowState, getVerifyFlowState } from '../../verify/state.js';

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

  if (!userId) {
    return;
  }

  // Check if this is a deep link with group verification payload
  if (payload && payload.startsWith('g_')) {
    await handleDeepLinkVerification(ctx, userId, payload);
    return;
  }

  // Check if user has an active verification flow
  const existingFlow = getVerifyFlowState(userId.toString());
  if (existingFlow && existingFlow.step === 'AWAITING_ADDRESS') {
    await ctx.reply(
      `You have an active verification in progress for *${escapeMarkdown(existingFlow.groupTitle)}*.\n\n` +
        `Please send your BCH address (cashaddr format) to continue.\n\n` +
        `Or type /cancel to stop.`,
      { parse_mode: 'Markdown' }
    );
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

async function handleDeepLinkVerification(ctx: Context, userId: number, payload: string) {
  // Parse deep link: g_<groupId>_<setupCode>
  const parts = payload.split('_');
  if (parts.length !== 3 || parts[0] !== 'g') {
    logger.warn({ userId, payload }, 'Invalid deep link format');
    await ctx.reply('Invalid verification link. Please use the link provided by the group admin.');
    return;
  }

  const groupId = parts[1];
  const setupCode = parts[2];

  logger.info({ userId, groupId, setupCode: setupCode.slice(0, 4) + '...' }, 'Parsing deep link');

  // Validate setup_code against DB
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      gateRules: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!group) {
    logger.warn({ userId, groupId }, 'Group not found for deep link');
    await ctx.reply('Invalid verification link. The group may no longer be configured.');
    return;
  }

  if (group.setupCode !== setupCode) {
    logger.warn({ userId, groupId }, 'Setup code mismatch');
    await ctx.reply('Invalid verification link. Please request a new link from the group admin.');
    return;
  }

  if (group.status !== 'ACTIVE') {
    logger.info({ userId, groupId, status: group.status }, 'Group is paused');
    await ctx.reply('Verification is currently paused for this group. Please try again later.');
    return;
  }

  if (group.gateRules.length === 0) {
    logger.warn({ userId, groupId }, 'No gate rules found');
    await ctx.reply('This group has not been fully configured yet. Please contact the admin.');
    return;
  }

  const rule = group.gateRules[0];

  if (!rule.verifyAddress) {
    logger.warn({ userId, groupId }, 'No verification address configured');
    await ctx.reply('Verification is not properly configured. Please contact the admin.');
    return;
  }

  // Ensure user exists in DB
  await prisma.user.upsert({
    where: { tgUserId: userId.toString() },
    update: {
      username: ctx.from?.username,
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
    },
    create: {
      tgUserId: userId.toString(),
      username: ctx.from?.username,
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
    },
  });

  // Format threshold for display
  const threshold = formatThreshold(rule);

  // Create verification flow state
  createVerifyFlowState(
    userId.toString(),
    groupId,
    group.title,
    rule.gateType,
    rule.tokenId,
    threshold,
    rule.verifyAddress
  );

  // Show gate requirements and prompt for address
  const summary = [
    `*Token Gate Verification*`,
    ``,
    `*Group:* ${escapeMarkdown(group.title)}`,
    ``,
    `*Requirements:*`,
    `• Token Type: ${rule.gateType}`,
    `• Token ID: \`${rule.tokenId.slice(0, 16)}...\``,
    `• Minimum: ${threshold}`,
    ``,
    `*Verification Process:*`,
    `1. Submit your BCH address`,
    `2. Send a small amount (${rule.verifyMinSat}-${rule.verifyMaxSat} sats) to prove ownership`,
    `3. Token balance will be checked automatically`,
    ``,
    `*Please send your BCH address now* (cashaddr format).`,
    ``,
    `Example: \`bitcoincash:qz...\``,
  ].join('\n');

  await ctx.reply(summary, { parse_mode: 'Markdown' });

  logger.info({ userId, groupId, gateType: rule.gateType }, 'Verification flow started');
}

function formatThreshold(rule: {
  gateType: string;
  minAmountBase: string | null;
  minNftCount: number | null;
  decimals: number | null;
}): string {
  if (rule.gateType === 'FT') {
    const base = BigInt(rule.minAmountBase ?? '0');
    const decimals = rule.decimals ?? 0;
    if (decimals > 0) {
      const divisor = BigInt(10 ** decimals);
      const whole = base / divisor;
      const frac = base % divisor;
      if (frac === 0n) {
        return `${whole} tokens`;
      }
      return `${whole}.${frac.toString().padStart(decimals, '0').replace(/0+$/, '')} tokens`;
    }
    return `${base} tokens (base units)`;
  } else {
    return `${rule.minNftCount ?? 1} NFT(s)`;
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
