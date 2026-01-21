import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import { prisma } from '../../db/client.js';
import { isGroupAdmin } from '../util/permissions.js';

const logger = createChildLogger('bot:cmd:export');

export async function handleExport(ctx: Context) {
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const fromUserId = ctx.from?.id;

  logger.info({ chatId, chatType, fromUserId }, '/export command received');

  // Only allow in groups/supergroups
  if (chatType !== 'group' && chatType !== 'supergroup') {
    await ctx.reply('The /export command can only be used in groups.');
    return;
  }

  if (!chatId || !fromUserId) {
    return;
  }

  // Check if caller is admin
  const isAdmin = await isGroupAdmin(ctx, chatId, fromUserId);
  if (!isAdmin) {
    await ctx.reply('Only group admins can export membership data.');
    return;
  }

  const groupId = chatId.toString();

  // Fetch all memberships with user data
  const memberships = await prisma.membership.findMany({
    where: { groupId },
    include: {
      user: {
        include: {
          addresses: {
            where: { active: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (memberships.length === 0) {
    await ctx.reply('No membership records found for this group.');
    return;
  }

  // Generate CSV content
  const csvLines: string[] = [];

  // Header row
  csvLines.push(
    'user_id,username,first_name,address,state,last_balance,last_checked,enforced,updated_at'
  );

  // Data rows
  for (const m of memberships) {
    const user = m.user;
    const address = user.addresses[0]?.address ?? '';

    const row = [
      csvEscape(user.tgUserId),
      csvEscape(user.username ?? ''),
      csvEscape(user.firstName ?? ''),
      csvEscape(address),
      csvEscape(m.state),
      csvEscape(m.lastBalanceBase ?? ''),
      csvEscape(m.lastCheckedAt?.toISOString() ?? ''),
      csvEscape(m.enforced),
      csvEscape(m.updatedAt.toISOString()),
    ];

    csvLines.push(row.join(','));
  }

  const csvContent = csvLines.join('\n');

  // Try to send as file
  try {
    const filename = `members_${groupId}_${Date.now()}.csv`;
    const buffer = Buffer.from(csvContent, 'utf-8');

    await ctx.replyWithDocument(
      {
        source: buffer,
        filename,
      },
      {
        caption: `Membership export: ${memberships.length} records`,
      }
    );

    logger.info({ groupId, count: memberships.length }, 'CSV export sent as file');
  } catch (error) {
    logger.warn({ error, groupId }, 'Failed to send CSV as file, falling back to text');

    // Fallback: send as text message(s)
    // Split into chunks if too long (Telegram limit ~4096 chars)
    const MAX_MESSAGE_LENGTH = 4000;

    if (csvContent.length <= MAX_MESSAGE_LENGTH) {
      await ctx.reply(`\`\`\`\n${csvContent}\n\`\`\``, { parse_mode: 'Markdown' });
    } else {
      // Send header + summary instead
      const summary = [
        '*Membership Export*',
        `Total records: ${memberships.length}`,
        '',
        '*Data preview (first 10 rows):*',
        '```',
        csvLines.slice(0, 11).join('\n'),
        '```',
        '',
        '_Full export too large for message. Please contact admin for file export._',
      ].join('\n');

      await ctx.reply(summary, { parse_mode: 'Markdown' });
    }
  }
}

function csvEscape(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // Escape internal quotes by doubling them
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
