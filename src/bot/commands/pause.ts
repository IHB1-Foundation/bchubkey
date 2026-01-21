import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import { prisma } from '../../db/client.js';
import { isGroupAdmin } from '../util/permissions.js';

const logger = createChildLogger('bot:cmd:pause');

export async function handlePause(ctx: Context) {
  await handlePauseResume(ctx, 'PAUSED');
}

export async function handleResume(ctx: Context) {
  await handlePauseResume(ctx, 'ACTIVE');
}

async function handlePauseResume(ctx: Context, targetStatus: 'ACTIVE' | 'PAUSED') {
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const fromUserId = ctx.from?.id;
  const command = targetStatus === 'PAUSED' ? '/pause' : '/resume';

  logger.info({ chatId, chatType, fromUserId, command }, `${command} command received`);

  // Only allow in groups/supergroups
  if (chatType !== 'group' && chatType !== 'supergroup') {
    await ctx.reply(`The ${command} command can only be used in groups.`);
    return;
  }

  if (!chatId || !fromUserId) {
    return;
  }

  // Check if caller is admin
  const isAdmin = await isGroupAdmin(ctx, chatId, fromUserId);
  if (!isAdmin) {
    await ctx.reply(`Only group admins can use ${command}.`);
    return;
  }

  const groupId = chatId.toString();

  // Check if group exists
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) {
    await ctx.reply(
      '*Group not configured*\n\n' +
        'This group has not been set up yet.\n' +
        'Run /setup to configure token gating.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Check if already in target status
  if (group.status === targetStatus) {
    const statusText = targetStatus === 'PAUSED' ? 'already paused' : 'already active';
    await ctx.reply(`Enforcement is ${statusText}.`);
    return;
  }

  // Update status
  await prisma.group.update({
    where: { id: groupId },
    data: { status: targetStatus },
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      groupId,
      tgUserId: fromUserId.toString(),
      type: targetStatus === 'PAUSED' ? 'SETUP' : 'SETUP',
      payloadJson: JSON.stringify({
        action: command,
        previousStatus: group.status,
        newStatus: targetStatus,
      }),
    },
  });

  if (targetStatus === 'PAUSED') {
    await ctx.reply(
      '*Enforcement Paused*\n\n' +
        'Token gate enforcement is now paused.\n' +
        'Scheduled rechecks and grace enforcement will be skipped.\n\n' +
        'Use /resume to re-enable enforcement.',
      { parse_mode: 'Markdown' }
    );
  } else {
    await ctx.reply(
      '*Enforcement Resumed*\n\n' +
        'Token gate enforcement is now active.\n' +
        'Scheduled rechecks and grace enforcement will run normally.\n\n' +
        'Use /pause to pause enforcement.',
      { parse_mode: 'Markdown' }
    );
  }

  logger.info({ groupId, previousStatus: group.status, newStatus: targetStatus }, 'Group status updated');
}
