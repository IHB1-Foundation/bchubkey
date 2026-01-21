import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import { prisma } from '../../db/client.js';
import { isGroupAdmin } from '../util/permissions.js';

const logger = createChildLogger('bot:cmd:members');

const TOP_N = 5;

export async function handleMembers(ctx: Context) {
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const userId = ctx.from?.id;

  logger.info({ chatId, chatType, userId }, '/members command received');

  // Only allow in groups/supergroups
  if (chatType !== 'group' && chatType !== 'supergroup') {
    await ctx.reply('The /members command can only be used in groups.');
    return;
  }

  if (!chatId || !userId) {
    return;
  }

  // Check if caller is admin
  const isAdmin = await isGroupAdmin(ctx, chatId, userId);
  if (!isAdmin) {
    await ctx.reply('Only group admins can view member summary.');
    return;
  }

  const groupId = chatId.toString();

  // Get membership counts by state
  const counts = await prisma.membership.groupBy({
    by: ['state'],
    where: { groupId },
    _count: true,
  });

  const countMap = new Map(counts.map((c) => [c.state, c._count]));
  const passCount = countMap.get('VERIFIED_PASS') ?? 0;
  const failCount = countMap.get('VERIFIED_FAIL') ?? 0;
  const pendingCount = countMap.get('PENDING_VERIFY') ?? 0;
  const unknownCount = countMap.get('UNKNOWN') ?? 0;
  const totalCount = passCount + failCount + pendingCount + unknownCount;

  // Get recent failures (most recent first)
  const recentFails = await prisma.membership.findMany({
    where: {
      groupId,
      state: 'VERIFIED_FAIL',
    },
    orderBy: { updatedAt: 'desc' },
    take: TOP_N,
    include: {
      user: true,
    },
  });

  // Get recent passes (most recent first)
  const recentPasses = await prisma.membership.findMany({
    where: {
      groupId,
      state: 'VERIFIED_PASS',
    },
    orderBy: { updatedAt: 'desc' },
    take: TOP_N,
    include: {
      user: true,
    },
  });

  // Format user info helper
  const formatUser = (user: { tgUserId: string; username: string | null; firstName: string | null }) => {
    if (user.username) {
      return `@${user.username}`;
    } else if (user.firstName) {
      return user.firstName;
    } else {
      return `User ${user.tgUserId}`;
    }
  };

  // Build message
  const lines: string[] = [
    `*Member Summary*`,
    ``,
    `*Total:* ${totalCount} tracked memberships`,
    ``,
    `✅ *PASS:* ${passCount}`,
    `❌ *FAIL:* ${failCount}`,
    `⏳ *PENDING:* ${pendingCount}`,
    `❓ *UNKNOWN:* ${unknownCount}`,
  ];

  if (recentFails.length > 0) {
    lines.push(``);
    lines.push(`*Recent Failures:*`);
    for (const m of recentFails) {
      const timeAgo = formatTimeAgo(m.updatedAt);
      const balance = m.lastBalanceBase ?? '0';
      lines.push(`• ${formatUser(m.user)} - ${balance} (${timeAgo})`);
    }
  }

  if (recentPasses.length > 0) {
    lines.push(``);
    lines.push(`*Recent Passes:*`);
    for (const m of recentPasses) {
      const timeAgo = formatTimeAgo(m.updatedAt);
      const balance = m.lastBalanceBase ?? '0';
      lines.push(`• ${formatUser(m.user)} - ${balance} (${timeAgo})`);
    }
  }

  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(seconds / 86400);
    return `${days}d ago`;
  }
}
