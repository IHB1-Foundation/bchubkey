import type { Context } from 'telegraf';
import { prisma } from '../../db/client.js';
import { processGateCheck } from '../../gate/index.js';
import { createChildLogger } from '../../util/logger.js';

const logger = createChildLogger('bot:cmd:recheck');
const MAX_GROUPS_PER_REQUEST = 20;

export async function handleRecheck(ctx: Context) {
  const chatType = ctx.chat?.type;
  const userId = ctx.from?.id;

  logger.info({ chatType, userId }, '/recheck command received');

  if (chatType !== 'private') {
    await ctx.reply('Use /recheck in a private chat with the bot.');
    return;
  }

  if (!userId) return;

  const tgUserId = userId.toString();

  const verifiedAddress = await prisma.userAddress.findFirst({
    where: {
      tgUserId,
      active: true,
      verified: true,
    },
  });

  if (!verifiedAddress) {
    await ctx.reply(
      `No verified active address found.\n\n` + `Run /verify first to complete ownership proof.`
    );
    return;
  }

  const memberships = await prisma.membership.findMany({
    where: { tgUserId },
    distinct: ['groupId'],
    select: { groupId: true },
    take: MAX_GROUPS_PER_REQUEST,
  });

  if (memberships.length === 0) {
    await ctx.reply('No group memberships found to recheck yet.');
    return;
  }

  await ctx.reply(`Running immediate gate check for ${memberships.length} group(s)...`);

  let success = 0;
  let failed = 0;

  for (const membership of memberships) {
    try {
      await processGateCheck(tgUserId, membership.groupId);
      success++;
    } catch (error) {
      failed++;
      logger.error({ error, tgUserId, groupId: membership.groupId }, 'Manual recheck failed');
    }
  }

  await ctx.reply(
    `Recheck complete.\n\n` +
      `• Success: ${success}\n` +
      `• Failed: ${failed}\n\n` +
      `You may receive per-group pass/fail notifications shortly.`
  );
}
