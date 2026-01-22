import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import { prisma } from '../../db/client.js';
import { isGroupAdmin } from '../util/permissions.js';

const logger = createChildLogger('bot:cmd:audit');

const MAX_LOGS = 10;

export async function handleAudit(ctx: Context) {
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const fromUserId = ctx.from?.id;
  const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

  logger.info({ chatId, chatType, fromUserId, message }, '/audit command received');

  // Only allow in groups/supergroups
  if (chatType !== 'group' && chatType !== 'supergroup') {
    await ctx.reply('The /audit command can only be used in groups.');
    return;
  }

  if (!chatId || !fromUserId) {
    return;
  }

  // Check if caller is admin
  const isAdmin = await isGroupAdmin(ctx, chatId, fromUserId);
  if (!isAdmin) {
    await ctx.reply('Only group admins can use /audit.');
    return;
  }

  // Parse user argument: /audit @username or /audit 123456789
  const args = message.split(/\s+/).slice(1);
  if (args.length === 0) {
    await ctx.reply(
      '*Usage:* `/audit @username` or `/audit 123456789`\n\n' +
        'Shows user verification status, address, and audit history.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const userArg = args[0];
  let targetUserId: string | null = null;

  // Try to parse as @username or numeric ID
  if (userArg.startsWith('@')) {
    // Look up by username (Telegram usernames are case-insensitive)
    const username = userArg.slice(1);
    const user = await prisma.user.findFirst({
      where: {
        username: username,
      },
    });
    // Also try lowercase if not found
    if (user) {
      targetUserId = user.tgUserId;
    } else {
      const userLower = await prisma.user.findFirst({
        where: {
          username: username.toLowerCase(),
        },
      });
      if (userLower) {
        targetUserId = userLower.tgUserId;
      }
    }
  } else {
    // Assume numeric ID
    const numericId = userArg.replace(/[^0-9]/g, '');
    if (numericId.length > 0) {
      targetUserId = numericId;
    }
  }

  if (!targetUserId) {
    await ctx.reply(
      `*User not found:* \`${escapeMarkdown(userArg)}\`\n\n` +
        'Make sure the user has interacted with this bot before.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const groupId = chatId.toString();

  // Fetch user data
  const user = await prisma.user.findUnique({
    where: { tgUserId: targetUserId },
    include: {
      addresses: {
        where: { active: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!user) {
    await ctx.reply(
      `*User not found:* ID \`${targetUserId}\`\n\n` + 'This user has not interacted with the bot.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Fetch membership for this group
  const membership = await prisma.membership.findUnique({
    where: {
      tgUserId_groupId: {
        tgUserId: targetUserId,
        groupId,
      },
    },
  });

  // Fetch recent audit logs for this user in this group
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      groupId,
      tgUserId: targetUserId,
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_LOGS,
  });

  // Format output
  const lines: string[] = [
    `*User Audit*`,
    ``,
    `*User:* ${formatUserDisplay(user)}`,
    `*Telegram ID:* \`${user.tgUserId}\``,
  ];

  // Address info
  const activeAddress = user.addresses[0];
  if (activeAddress) {
    const verifiedStatus = activeAddress.verified
      ? `Verified ${formatDate(activeAddress.verifiedAt)}`
      : 'Not verified';
    lines.push(`*Address:* \`${activeAddress.address.slice(0, 30)}...\``);
    lines.push(`*Address Status:* ${verifiedStatus}`);
  } else {
    lines.push(`*Address:* None linked`);
  }

  lines.push(``);

  // Membership info
  if (membership) {
    lines.push(`*Membership State:* ${formatState(membership.state)}`);
    lines.push(`*Last Balance:* ${membership.lastBalanceBase ?? 'N/A'} base units`);
    lines.push(`*Last Checked:* ${formatDate(membership.lastCheckedAt)}`);
    lines.push(`*Enforcement:* ${formatEnforced(membership.enforced)}`);

    if (membership.failDetectedAt) {
      lines.push(`*Fail Detected:* ${formatDate(membership.failDetectedAt)}`);
    }
  } else {
    lines.push(`*Membership:* No record for this group`);
  }

  // Audit log history
  if (auditLogs.length > 0) {
    lines.push(``);
    lines.push(`*Recent Activity (${auditLogs.length}):*`);

    for (const log of auditLogs) {
      const time = formatTimeAgo(log.createdAt);
      const emoji = getLogEmoji(log.type);
      lines.push(`${emoji} ${log.type} (${time})`);
    }
  } else {
    lines.push(``);
    lines.push(`*Recent Activity:* None`);
  }

  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  logger.info({ targetUserId, groupId }, 'Audit info displayed');
}

function formatUserDisplay(user: {
  tgUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}): string {
  const parts: string[] = [];

  if (user.firstName) parts.push(user.firstName);
  if (user.lastName) parts.push(user.lastName);

  const name = parts.length > 0 ? parts.join(' ') : `User ${user.tgUserId}`;

  if (user.username) {
    return `${name} (@${user.username})`;
  }
  return name;
}

function formatState(state: string): string {
  switch (state) {
    case 'VERIFIED_PASS':
      return '✅ PASS';
    case 'VERIFIED_FAIL':
      return '❌ FAIL';
    case 'PENDING_VERIFY':
      return '⏳ PENDING';
    case 'UNKNOWN':
      return '❓ UNKNOWN';
    default:
      return state;
  }
}

function formatEnforced(enforced: string): string {
  switch (enforced) {
    case 'NONE':
      return 'None';
    case 'RESTRICTED':
      return '🔇 Restricted';
    case 'KICKED':
      return '🚫 Kicked';
    default:
      return enforced;
  }
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return 'Never';
  return date.toISOString().replace('T', ' ').slice(0, 19);
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

function getLogEmoji(type: string): string {
  switch (type) {
    case 'SETUP':
      return '⚙️';
    case 'VERIFY_START':
      return '🔑';
    case 'VERIFY_SUCCESS':
      return '✅';
    case 'VERIFY_FAILED':
      return '❌';
    case 'VERIFY_EXPIRED':
      return '⏰';
    case 'GATE_PASS':
      return '🎉';
    case 'GATE_FAIL':
      return '🚫';
    case 'RESTRICT':
      return '🔇';
    case 'UNRESTRICT':
      return '🔊';
    case 'KICK':
      return '👢';
    case 'RECHECK':
      return '🔄';
    case 'GRACE_START':
      return '⏳';
    case 'GRACE_EXPIRED':
      return '💀';
    case 'ERROR':
      return '⚠️';
    default:
      return '📋';
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
