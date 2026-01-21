import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import { prisma } from '../../db/client.js';
import { isGroupAdmin } from '../util/permissions.js';

const logger = createChildLogger('bot:cmd:settings');

export async function handleSettings(ctx: Context) {
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const userId = ctx.from?.id;

  logger.info({ chatId, chatType, userId }, '/settings command received');

  // Only allow in groups/supergroups
  if (chatType !== 'group' && chatType !== 'supergroup') {
    await ctx.reply('The /settings command can only be used in groups.');
    return;
  }

  if (!chatId || !userId) {
    return;
  }

  // Check if caller is admin
  const isAdmin = await isGroupAdmin(ctx, chatId, userId);
  if (!isAdmin) {
    await ctx.reply('Only group admins can view settings.');
    return;
  }

  // Fetch group and gate rule from DB
  const group = await prisma.group.findUnique({
    where: { id: chatId.toString() },
    include: {
      gateRules: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!group || group.gateRules.length === 0) {
    await ctx.reply(
      '*No configuration found*\n\n' +
        'This group has not been configured yet.\n' +
        'Run /setup to configure token gating.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const rule = group.gateRules[0];
  const botName = process.env.BOT_PUBLIC_NAME ?? 'YourBot';
  const deepLink = `https://t.me/${botName}?start=g_${group.id}_${group.setupCode}`;

  const thresholdText =
    rule.gateType === 'FT'
      ? `${rule.minAmountBase} base units${rule.decimals ? ` (${rule.decimals} decimals)` : ''}`
      : `${rule.minNftCount} NFT(s)`;

  const summary = [
    `*Token Gate Settings*`,
    ``,
    `*Status:* ${group.status === 'ACTIVE' ? 'Active' : 'Paused'}`,
    `*Gate Type:* ${rule.gateType}`,
    `*Token ID:* \`${rule.tokenId.slice(0, 16)}...\``,
    `*Minimum Required:* ${thresholdText}`,
    `*Join Mode:* ${group.mode}`,
    `*Recheck Interval:* ${rule.recheckIntervalSec / 60} minutes`,
    `*Grace Period:* ${rule.gracePeriodSec / 60} minutes`,
    `*Action on Fail:* ${rule.actionOnFail}`,
    ``,
    `*Verification:*`,
    `• Address: ${rule.verifyAddress?.slice(0, 30)}...`,
    `• Amount Range: ${rule.verifyMinSat}-${rule.verifyMaxSat} sats`,
    `• Session TTL: ${rule.verifyExpireMin} minutes`,
    ``,
    `*Verification Link:*`,
    `\`${deepLink}\``,
    ``,
    `_Share this link with members to start verification._`,
  ].join('\n');

  await ctx.reply(summary, { parse_mode: 'Markdown' });
}
