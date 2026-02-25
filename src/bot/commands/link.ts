import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { prisma } from '../../db/client.js';
import { createChildLogger } from '../../util/logger.js';
import { validateCashAddress } from '../../util/cashaddr.js';
import { getVerifyFlowState, updateVerifyFlowState } from '../../verify/state.js';

const logger = createChildLogger('bot:cmd:link');

export async function handleLink(ctx: Context) {
  const chatType = ctx.chat?.type;
  const from = ctx.from;
  const message = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

  logger.info({ chatType, userId: from?.id }, '/link command received');

  if (chatType !== 'private') {
    await ctx.reply('Use /link in a private chat with the bot.');
    return;
  }

  if (!from?.id) return;

  const tgUserId = from.id.toString();
  const args = message.split(/\s+/).slice(1);
  const inputAddress = args[0];
  const flow = getVerifyFlowState(tgUserId);

  if (!inputAddress) {
    if (flow) {
      updateVerifyFlowState(tgUserId, {
        step: 'AWAITING_ADDRESS',
        address: undefined,
        sessionId: undefined,
      });
      await ctx.reply('Please send your new BCH address (cashaddr format).');
      return;
    }

    await ctx.reply(
      `Usage:\n` +
        `• \`/link bitcoincash:q...\` to change address\n` +
        `• or use \`/verify\` to restart flow from group context`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const validation = validateCashAddress(inputAddress);
  if (!validation.valid || !validation.address) {
    await ctx.reply(
      `Invalid BCH address.\n\n` +
        `${validation.error ?? 'Please provide a valid cashaddr.'}`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  await prisma.user.upsert({
    where: { tgUserId },
    update: {
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      updatedAt: new Date(),
    },
    create: {
      tgUserId,
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
    },
  });

  await prisma.userAddress.updateMany({
    where: { tgUserId, active: true },
    data: { active: false },
  });

  await prisma.userAddress.create({
    data: {
      tgUserId,
      address: validation.address,
      addressType: validation.type ?? 'UNKNOWN',
      verified: false,
      active: true,
    },
  });

  await prisma.verifySession.updateMany({
    where: { tgUserId, status: 'PENDING' },
    data: { status: 'EXPIRED' },
  });

  await prisma.membership.updateMany({
    where: { tgUserId },
    data: {
      state: 'PENDING_VERIFY',
      lastBalanceBase: null,
      failDetectedAt: null,
    },
  });

  if (flow) {
    updateVerifyFlowState(tgUserId, {
      step: 'AWAITING_TX',
      address: validation.address,
      sessionId: undefined,
    });

    await ctx.reply(
      `Address updated.\n\nClick to continue ownership proof.`,
      {
        ...Markup.inlineKeyboard([
          [Markup.button.callback('Proceed to Verification', `verify_proceed:${flow.groupId}`)],
          [Markup.button.callback('Cancel', 'verify_cancel')],
        ]),
      }
    );
    return;
  }

  await ctx.reply(
    `Address updated to:\n\`${shorten(validation.address)}\`\n\n` +
      `Now run /verify or use your group verification link to complete ownership proof.`,
    { parse_mode: 'Markdown' }
  );
}

function shorten(address: string): string {
  if (address.length <= 28) return address;
  return `${address.slice(0, 14)}...${address.slice(-8)}`;
}
