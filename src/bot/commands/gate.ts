import type { Context } from 'telegraf';
import { prisma } from '../../db/client.js';
import { createChildLogger } from '../../util/logger.js';
import { isGroupAdmin } from '../util/permissions.js';
import type { GroupMode } from '../../generated/prisma/client.js';

const logger = createChildLogger('bot:cmd:gate');

export async function handleGate(ctx: Context) {
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const fromUserId = ctx.from?.id;
  const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

  logger.info({ chatId, chatType, fromUserId, message }, '/gate command received');

  if (chatType !== 'group' && chatType !== 'supergroup') {
    await ctx.reply('The /gate command can only be used in groups.');
    return;
  }

  if (!chatId || !fromUserId) return;

  const isAdmin = await isGroupAdmin(ctx, chatId, fromUserId);
  if (!isAdmin) {
    await ctx.reply('Only group admins can use /gate.');
    return;
  }

  const groupId = chatId.toString();
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  const gateRule = await prisma.gateRule.findFirst({
    where: { groupId },
    orderBy: { createdAt: 'desc' },
  });

  if (!group || !gateRule) {
    await ctx.reply(
      '*No configuration found*\n\n' +
        'This group has not been set up yet.\n' +
        'Run /setup first.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const args = message.split(/\s+/).slice(1);
  const sub = args[0]?.toLowerCase();

  if (!sub) {
    await ctx.reply(renderUsage(group.mode, gateRule.recheckIntervalSec, gateRule.gracePeriodSec), {
      parse_mode: 'Markdown',
    });
    return;
  }

  switch (sub) {
    case 'set':
      await handleGateSet(ctx, groupId, fromUserId.toString(), gateRule.id, gateRule.gateType, args);
      return;
    case 'mode':
      await handleGateMode(ctx, groupId, fromUserId.toString(), args);
      return;
    case 'grace':
      await handleGateGrace(ctx, groupId, fromUserId.toString(), gateRule.id, args);
      return;
    case 'interval':
      await handleGateInterval(ctx, groupId, fromUserId.toString(), gateRule.id, args);
      return;
    default:
      await ctx.reply(renderUsage(group.mode, gateRule.recheckIntervalSec, gateRule.gracePeriodSec), {
        parse_mode: 'Markdown',
      });
  }
}

async function handleGateSet(
  ctx: Context,
  groupId: string,
  actorTgUserId: string,
  gateRuleId: string,
  gateType: 'FT' | 'NFT',
  args: string[]
) {
  const tokenId = args[1]?.toLowerCase();
  const minRaw = args[2];

  if (!tokenId || !minRaw) {
    await ctx.reply(
      `Usage: \`/gate set <tokenId> <min>\`\n\n` +
        `Example: \`/gate set aabbcc... 1\``,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (!/^[a-f0-9]{64}$/.test(tokenId)) {
    await ctx.reply('Invalid token category ID. Must be 64-char hex.');
    return;
  }

  if (gateType === 'FT') {
    let minAmount: bigint;
    try {
      minAmount = BigInt(minRaw);
    } catch {
      await ctx.reply('For FT mode, <min> must be a positive integer in base units.');
      return;
    }

    if (minAmount <= 0n) {
      await ctx.reply('For FT mode, <min> must be greater than 0.');
      return;
    }

    await prisma.gateRule.update({
      where: { id: gateRuleId },
      data: {
        tokenId,
        minAmountBase: minAmount.toString(),
      },
    });
  } else {
    const minCount = parseInt(minRaw, 10);
    if (!Number.isInteger(minCount) || minCount <= 0) {
      await ctx.reply('For NFT mode, <min> must be a positive integer.');
      return;
    }

    await prisma.gateRule.update({
      where: { id: gateRuleId },
      data: {
        tokenId,
        minNftCount: minCount,
      },
    });
  }

  await logGateAudit(groupId, actorTgUserId, 'set', { tokenId, min: minRaw });

  await ctx.reply(
    `Gate updated.\n\n` +
      `• Token: \`${tokenId.slice(0, 16)}...\`\n` +
      `• Minimum: ${minRaw}`,
    { parse_mode: 'Markdown' }
  );
}

async function handleGateMode(
  ctx: Context,
  groupId: string,
  actorTgUserId: string,
  args: string[]
) {
  const modeArg = args[1]?.toLowerCase();
  if (!modeArg || (modeArg !== 'join' && modeArg !== 'restrict')) {
    await ctx.reply('Usage: `/gate mode <join|restrict>`', { parse_mode: 'Markdown' });
    return;
  }

  const mode: GroupMode = modeArg === 'join' ? 'JOIN_REQUEST' : 'RESTRICT';

  await prisma.group.update({
    where: { id: groupId },
    data: { mode },
  });

  await logGateAudit(groupId, actorTgUserId, 'mode', { mode });
  await ctx.reply(`Join mode updated: *${mode}*`, { parse_mode: 'Markdown' });
}

async function handleGateGrace(
  ctx: Context,
  groupId: string,
  actorTgUserId: string,
  gateRuleId: string,
  args: string[]
) {
  const minutesRaw = args[1];
  const minutes = minutesRaw ? parseInt(minutesRaw, 10) : NaN;

  if (!Number.isInteger(minutes) || minutes < 0) {
    await ctx.reply('Usage: `/gate grace <minutes>` (0 or greater)', { parse_mode: 'Markdown' });
    return;
  }

  await prisma.gateRule.update({
    where: { id: gateRuleId },
    data: { gracePeriodSec: minutes * 60 },
  });

  await logGateAudit(groupId, actorTgUserId, 'grace', { minutes });
  await ctx.reply(`Grace period updated: *${minutes} minute(s)*`, { parse_mode: 'Markdown' });
}

async function handleGateInterval(
  ctx: Context,
  groupId: string,
  actorTgUserId: string,
  gateRuleId: string,
  args: string[]
) {
  const minutesRaw = args[1];
  const minutes = minutesRaw ? parseInt(minutesRaw, 10) : NaN;

  if (!Number.isInteger(minutes) || minutes < 1) {
    await ctx.reply('Usage: `/gate interval <minutes>` (1 or greater)', { parse_mode: 'Markdown' });
    return;
  }

  await prisma.gateRule.update({
    where: { id: gateRuleId },
    data: { recheckIntervalSec: minutes * 60 },
  });

  await logGateAudit(groupId, actorTgUserId, 'interval', { minutes });
  await ctx.reply(`Recheck interval updated: *${minutes} minute(s)*`, { parse_mode: 'Markdown' });
}

async function logGateAudit(
  groupId: string,
  tgUserId: string,
  action: string,
  payload: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      groupId,
      tgUserId,
      type: 'SETUP',
      payloadJson: JSON.stringify({
        action: `/gate ${action}`,
        ...payload,
      }),
    },
  });
}

function renderUsage(mode: GroupMode, recheckIntervalSec: number, gracePeriodSec: number): string {
  return (
    `*Gate Commands*\n\n` +
    `Current mode: *${mode}*\n` +
    `Current interval: *${Math.floor(recheckIntervalSec / 60)} min*\n` +
    `Current grace: *${Math.floor(gracePeriodSec / 60)} min*\n\n` +
    `Usage:\n` +
    `• \`/gate set <tokenId> <min>\`\n` +
    `• \`/gate mode <join|restrict>\`\n` +
    `• \`/gate grace <minutes>\`\n` +
    `• \`/gate interval <minutes>\``
  );
}
