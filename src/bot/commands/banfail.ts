import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import { prisma } from '../../db/client.js';
import { isGroupAdmin } from '../util/permissions.js';
import type { ActionOnFail } from '../../generated/prisma/client.js';

const logger = createChildLogger('bot:cmd:banfail');

export async function handleBanfail(ctx: Context) {
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const fromUserId = ctx.from?.id;
  const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

  logger.info({ chatId, chatType, fromUserId, message }, '/banfail command received');

  // Only allow in groups/supergroups
  if (chatType !== 'group' && chatType !== 'supergroup') {
    await ctx.reply('The /banfail command can only be used in groups.');
    return;
  }

  if (!chatId || !fromUserId) {
    return;
  }

  // Check if caller is admin
  const isAdmin = await isGroupAdmin(ctx, chatId, fromUserId);
  if (!isAdmin) {
    await ctx.reply('Only group admins can use /banfail.');
    return;
  }

  const groupId = chatId.toString();

  // Parse argument: /banfail on|off
  const args = message.split(/\s+/).slice(1);
  const arg = args[0]?.toLowerCase();

  if (!arg || (arg !== 'on' && arg !== 'off')) {
    // Show current status
    const gateRule = await prisma.gateRule.findFirst({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    });

    if (!gateRule) {
      await ctx.reply(
        '*No configuration found*\n\n' +
          'This group has not been set up yet.\n' +
          'Run /setup to configure token gating.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const currentAction =
      gateRule.actionOnFail === 'KICK' ? 'ON (kick users)' : 'OFF (restrict only)';
    await ctx.reply(
      `*Ban on Fail Setting*\n\n` +
        `Current: ${currentAction}\n\n` +
        `Usage:\n` +
        `• \`/banfail on\` - Kick users when they fail after grace period\n` +
        `• \`/banfail off\` - Only restrict users (read-only)`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Get current gate rule
  const gateRule = await prisma.gateRule.findFirst({
    where: { groupId },
    orderBy: { createdAt: 'desc' },
  });

  if (!gateRule) {
    await ctx.reply(
      '*No configuration found*\n\n' +
        'This group has not been set up yet.\n' +
        'Run /setup to configure token gating.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const newAction: ActionOnFail = arg === 'on' ? 'KICK' : 'RESTRICT';
  const previousAction = gateRule.actionOnFail;

  // Check if already in target state
  if (gateRule.actionOnFail === newAction) {
    const actionText = newAction === 'KICK' ? 'already set to kick' : 'already set to restrict';
    await ctx.reply(`Ban on fail is ${actionText}.`);
    return;
  }

  // Update gate rule
  await prisma.gateRule.update({
    where: { id: gateRule.id },
    data: { actionOnFail: newAction },
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      groupId,
      tgUserId: fromUserId.toString(),
      type: 'SETUP',
      payloadJson: JSON.stringify({
        action: '/banfail',
        previousActionOnFail: previousAction,
        newActionOnFail: newAction,
      }),
    },
  });

  if (newAction === 'KICK') {
    await ctx.reply(
      '*Ban on Fail: ON*\n\n' +
        'Users who fail the token check after grace period will be kicked from the group.\n' +
        'They can rejoin and re-verify.\n\n' +
        'Use `/banfail off` to only restrict (read-only) instead.',
      { parse_mode: 'Markdown' }
    );
  } else {
    await ctx.reply(
      '*Ban on Fail: OFF*\n\n' +
        'Users who fail the token check after grace period will be restricted (read-only).\n' +
        'They can still see messages but cannot send.\n\n' +
        'Use `/banfail on` to kick users instead.',
      { parse_mode: 'Markdown' }
    );
  }

  logger.info({ groupId, previousAction, newAction }, 'Ban on fail setting updated');
}
