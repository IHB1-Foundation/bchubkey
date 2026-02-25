import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import { prisma } from '../../db/client.js';
import { isGroupAdmin } from '../util/permissions.js';

const logger = createChildLogger('bot:cmd:claim');

/**
 * /claim — Allows a Telegram group admin to claim OWNER role for the dashboard.
 * Uses Telegram's own admin verification as proof of ownership.
 * Must be run in a group/supergroup where the user is an admin.
 */
export async function handleClaim(ctx: Context) {
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const userId = ctx.from?.id;
  const username = ctx.from?.username ?? null;
  const firstName = ctx.from?.first_name ?? null;
  const lastName = ctx.from?.last_name ?? null;

  logger.info({ chatId, chatType, userId }, '/claim command received');

  if (chatType !== 'group' && chatType !== 'supergroup') {
    await ctx.reply('The /claim command can only be used in groups.');
    return;
  }

  if (!chatId || !userId) return;

  // Verify caller is a Telegram group admin (proof of ownership)
  const isAdmin = await isGroupAdmin(ctx, chatId, userId);
  if (!isAdmin) {
    await ctx.reply('Only Telegram group admins can claim dashboard access.');
    return;
  }

  const groupId = chatId.toString();
  const tgUserId = userId.toString();

  // Check if group exists in DB
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, title: true },
  });

  if (!group) {
    await ctx.reply(
      'This group is not configured yet.\n' + 'Run /setup first to configure token gating.'
    );
    return;
  }

  // Upsert AdminUser
  const adminUser = await prisma.adminUser.upsert({
    where: { tgUserId },
    update: {
      username,
      firstName,
      lastName,
      updatedAt: new Date(),
    },
    create: {
      tgUserId,
      username,
      firstName,
      lastName,
      authProvider: 'telegram',
    },
  });

  // Check if already has a role
  const existing = await prisma.groupAdmin.findUnique({
    where: {
      groupId_adminUserId: { groupId, adminUserId: adminUser.id },
    },
  });

  if (existing) {
    await ctx.reply(`You already have *${existing.role}* access to the dashboard for this group.`, {
      parse_mode: 'Markdown',
    });
    return;
  }

  // Check if group already has an OWNER — if not, grant OWNER; otherwise ADMIN
  const existingOwner = await prisma.groupAdmin.findFirst({
    where: { groupId, role: 'OWNER' },
  });

  const role = existingOwner ? 'ADMIN' : 'OWNER';

  await prisma.groupAdmin.create({
    data: {
      groupId,
      adminUserId: adminUser.id,
      role,
    },
  });

  logger.info({ groupId, adminUserId: adminUser.id, role }, 'Admin claimed dashboard access');

  await ctx.reply(
    `*Dashboard access granted*\n\n` +
      `Role: *${role}*\n` +
      `Group: ${group.title}\n\n` +
      `You can now log in to the admin dashboard using Telegram Login.`,
    { parse_mode: 'Markdown' }
  );
}
