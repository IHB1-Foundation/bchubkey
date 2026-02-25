import type { Context } from 'telegraf';
import { prisma } from '../../db/client.js';
import { createChildLogger } from '../../util/logger.js';

const logger = createChildLogger('bot:cmd:status');
const MAX_GROUPS = 10;

export async function handleStatus(ctx: Context) {
  const chatType = ctx.chat?.type;
  const userId = ctx.from?.id;

  logger.info({ userId, chatType }, '/status command received');

  if (chatType !== 'private') {
    await ctx.reply('Use /status in a private chat with the bot.');
    return;
  }

  if (!userId) return;

  const tgUserId = userId.toString();

  const user = await prisma.user.findUnique({
    where: { tgUserId },
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
      'No verification data found yet.\n\nUse your group verification deep link to start.'
    );
    return;
  }

  const memberships = await prisma.membership.findMany({
    where: { tgUserId },
    include: {
      group: {
        select: { title: true, status: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: MAX_GROUPS,
  });

  const pendingSessions = await prisma.verifySession.count({
    where: {
      tgUserId,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
  });

  const countByState = new Map<string, number>();
  for (const membership of memberships) {
    countByState.set(membership.state, (countByState.get(membership.state) ?? 0) + 1);
  }

  const activeAddress = user.addresses[0];
  const addressText = activeAddress ? `\`${truncate(activeAddress.address, 22)}\`` : 'Not linked';
  const verifiedText = activeAddress ? (activeAddress.verified ? 'Yes' : 'No') : 'No';

  const lines: string[] = [
    `*Your Status*`,
    ``,
    `*Telegram:* ${formatUser(user.username, user.firstName, tgUserId)}`,
    `*Active Address:* ${addressText}`,
    `*Address Verified:* ${verifiedText}`,
    `*Pending Verification Sessions:* ${pendingSessions}`,
    ``,
    `*Membership Summary*`,
    `✅ PASS: ${countByState.get('VERIFIED_PASS') ?? 0}`,
    `❌ FAIL: ${countByState.get('VERIFIED_FAIL') ?? 0}`,
    `⏳ PENDING: ${countByState.get('PENDING_VERIFY') ?? 0}`,
    `❓ UNKNOWN: ${countByState.get('UNKNOWN') ?? 0}`,
  ];

  if (memberships.length > 0) {
    lines.push('');
    lines.push(`*Recent Groups* (up to ${MAX_GROUPS})`);

    for (const membership of memberships) {
      lines.push(
        `• ${stateEmoji(membership.state)} ${escapeMarkdown(membership.group.title)} ` +
          `(${membership.state}, ${membership.group.status})`
      );
    }
  } else {
    lines.push('');
    lines.push('No group membership records yet.');
  }

  lines.push('');
  lines.push(`Tip: /verify to restart proof, /recheck for immediate gate check.`);

  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
}

function stateEmoji(state: string): string {
  switch (state) {
    case 'VERIFIED_PASS':
      return '✅';
    case 'VERIFIED_FAIL':
      return '❌';
    case 'PENDING_VERIFY':
      return '⏳';
    default:
      return '•';
  }
}

function formatUser(username: string | null, firstName: string | null, tgUserId: string): string {
  if (username) return `@${escapeMarkdown(username)}`;
  if (firstName) return escapeMarkdown(firstName);
  return `\`${tgUserId}\``;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
