import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import { prisma } from '../../db/client.js';
import { createVerifyFlowState, getVerifyFlowState } from '../../verify/state.js';
import { fetchTokenMetadata, type TokenMetadata } from '../../chain/metadata.js';
import { MessageBuilder, escapeMarkdown, formatTokenId, Messages } from '../util/messages.js';

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
    const msg = new MessageBuilder()
      .title('Verification In Progress')
      .blank()
      .field('Group', escapeMarkdown(existingFlow.groupTitle))
      .blank()
      .text('Please send your BCH address (cashaddr format) to continue.')
      .blank()
      .note('Type /cancel to stop.')
      .build();

    await ctx.reply(msg, { parse_mode: 'Markdown' });
    return;
  }

  // Standard /start in DM
  const welcomeMsg = new MessageBuilder()
    .title('Welcome to BCHubKey')
    .blank()
    .text('I help manage token-gated Telegram groups using CashTokens.')
    .blank()
    .section('Getting Started', [
      'Group admins: Add me to your group and run /setup',
      'Members: Use the deep link provided by the group admin',
    ])
    .blank()
    .section('Commands', [
      '/help - Show available commands',
      '/status - Check your verification status',
      '/privacy - Learn what data we store',
    ])
    .build();

  await ctx.reply(welcomeMsg, { parse_mode: 'Markdown' });
}

async function handleDeepLinkVerification(ctx: Context, userId: number, payload: string) {
  // Parse deep link: g_<groupId>_<setupCode>
  const parts = payload.split('_');
  if (parts.length !== 3 || parts[0] !== 'g') {
    logger.warn({ userId, payload }, 'Invalid deep link format');
    await ctx.reply(Messages.invalidLink(), { parse_mode: 'Markdown' });
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
    await ctx.reply(Messages.invalidLink(), { parse_mode: 'Markdown' });
    return;
  }

  if (group.setupCode !== setupCode) {
    logger.warn({ userId, groupId }, 'Setup code mismatch');
    await ctx.reply(Messages.invalidLink(), { parse_mode: 'Markdown' });
    return;
  }

  if (group.status !== 'ACTIVE') {
    logger.info({ userId, groupId, status: group.status }, 'Group is paused');
    await ctx.reply(Messages.groupPaused(), { parse_mode: 'Markdown' });
    return;
  }

  if (group.gateRules.length === 0) {
    logger.warn({ userId, groupId }, 'No gate rules found');
    const msg = new MessageBuilder()
      .title('Setup Incomplete')
      .blank()
      .text('This group has not been fully configured yet.')
      .blank()
      .action('Contact the group admin.')
      .build();
    await ctx.reply(msg, { parse_mode: 'Markdown' });
    return;
  }

  const rule = group.gateRules[0];

  if (!rule.verifyAddress) {
    logger.warn({ userId, groupId }, 'No verification address configured');
    const msg = new MessageBuilder()
      .title('Configuration Error')
      .blank()
      .text('Ownership proof is not properly configured.')
      .blank()
      .action('Contact the group admin.')
      .build();
    await ctx.reply(msg, { parse_mode: 'Markdown' });
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

  // Fetch token metadata (non-blocking, graceful failure)
  let tokenMetadata: TokenMetadata | null = null;
  try {
    tokenMetadata = await fetchTokenMetadata(rule.tokenId);
  } catch (error) {
    logger.warn({ error, tokenId: rule.tokenId }, 'Token metadata fetch failed');
    // Continue without metadata
  }

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

  // Build token display string
  const tokenDisplay = formatTokenDisplay(rule.tokenId, tokenMetadata);

  // Format threshold with symbol if available
  const thresholdWithSymbol = formatThresholdWithSymbol(rule, tokenMetadata);

  // Build gate requirements
  const gateRequirements = [
    `Token Type: ${rule.gateType}`,
    tokenDisplay,
    `Minimum: ${thresholdWithSymbol}`,
  ];

  // Show gate requirements and prompt for address
  const summary = new MessageBuilder()
    .step(1, 3, 'Submit Address')
    .blank()
    .field('Group', escapeMarkdown(group.title))
    .blank()
    .section('Gate Requirements', gateRequirements)
    .blank()
    .section('Verification Process', [
      'Submit your BCH address',
      `Prove ownership (send ${rule.verifyMinSat}-${rule.verifyMaxSat} sats)`,
      'Gate Check runs automatically',
    ])
    .blank()
    .action('Send your BCH address now (cashaddr format).')
    .blank()
    .code('bitcoincash:qz...')
    .build();

  // If token has an icon URL, try to send it as a photo with the summary as caption
  if (tokenMetadata?.iconUrl) {
    try {
      await ctx.replyWithPhoto(tokenMetadata.iconUrl, {
        caption: summary,
        parse_mode: 'Markdown',
      });
      logger.info(
        { userId, groupId, iconUrl: tokenMetadata.iconUrl },
        'Sent verification intro with token icon'
      );
    } catch (error) {
      // Icon failed to load, fall back to text only
      logger.warn({ error, iconUrl: tokenMetadata.iconUrl }, 'Token icon failed to load');
      await ctx.reply(summary, { parse_mode: 'Markdown' });
    }
  } else {
    await ctx.reply(summary, { parse_mode: 'Markdown' });
  }

  logger.info(
    { userId, groupId, gateType: rule.gateType, hasMetadata: !!tokenMetadata },
    'Verification flow started'
  );
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

function formatTokenDisplay(tokenId: string, metadata: TokenMetadata | null): string {
  if (metadata?.name || metadata?.symbol) {
    const parts: string[] = [];
    if (metadata.name) parts.push(escapeMarkdown(metadata.name));
    if (metadata.symbol) parts.push(`(${escapeMarkdown(metadata.symbol)})`);
    return `Token: ${parts.join(' ')}`;
  }
  return `Token ID: \`${formatTokenId(tokenId)}\``;
}

function formatThresholdWithSymbol(
  rule: {
    gateType: string;
    minAmountBase: string | null;
    minNftCount: number | null;
    decimals: number | null;
  },
  metadata: TokenMetadata | null
): string {
  if (rule.gateType === 'FT') {
    const base = BigInt(rule.minAmountBase ?? '0');
    const decimals = metadata?.decimals ?? rule.decimals ?? 0;
    const symbol = metadata?.symbol ? ` ${escapeMarkdown(metadata.symbol)}` : ' tokens';

    if (decimals > 0) {
      const divisor = BigInt(10 ** decimals);
      const whole = base / divisor;
      const frac = base % divisor;
      if (frac === 0n) {
        return `${whole}${symbol}`;
      }
      return `${whole}.${frac.toString().padStart(decimals, '0').replace(/0+$/, '')}${symbol}`;
    }
    return `${base}${symbol}`;
  } else {
    return `${rule.minNftCount ?? 1} NFT(s)`;
  }
}
