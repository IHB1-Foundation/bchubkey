import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { createChildLogger } from '../util/logger.js';
import { validateCashAddress, shortenAddress } from '../util/cashaddr.js';
import { prisma } from '../db/client.js';
import { getVerifyFlowState, updateVerifyFlowState, deleteVerifyFlowState } from './state.js';

const logger = createChildLogger('verify:handlers');

export async function handleVerifyTextInput(ctx: Context): Promise<boolean> {
  const userId = ctx.from?.id?.toString();
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;

  if (!userId || !text) return false;

  const state = getVerifyFlowState(userId);
  if (!state) return false;

  // Handle /cancel command
  if (text === '/cancel') {
    deleteVerifyFlowState(userId);
    await ctx.reply('Verification cancelled. Use the group link to start again.');
    logger.info({ userId }, 'Verification flow cancelled');
    return true;
  }

  switch (state.step) {
    case 'AWAITING_ADDRESS':
      await handleAddressInput(ctx, userId, text);
      return true;

    case 'AWAITING_TX':
      // User sent text while waiting for tx - remind them
      await ctx.reply(
        `Waiting for your transaction...\n\n` +
          `Send exactly the specified amount to the verification address, ` +
          `then click "I've Sent It" button.`
      );
      return true;

    default:
      return false;
  }
}

async function handleAddressInput(ctx: Context, userId: string, text: string) {
  const state = getVerifyFlowState(userId);
  if (!state) return;

  // Validate address
  const validation = validateCashAddress(text);

  if (!validation.valid || !validation.address) {
    await ctx.reply(
      `Invalid BCH address.\n\n` +
        `${validation.error ?? 'Please enter a valid cashaddr format address.'}\n\n` +
        `Example: \`bitcoincash:qz2jx5sxxt4wy3z6dycknpk55tcy54jqhcw4u52gxf\``,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Warn about P2SH addresses (may have issues with ownership proof)
  if (validation.type === 'P2SH') {
    await ctx.reply(
      `Note: You've entered a P2SH address (script hash).\n\n` +
        `Ownership verification works best with standard P2PKH addresses. ` +
        `If verification fails, try using a different address from a standard wallet.`
    );
  }

  const normalizedAddress = validation.address;

  logger.info(
    { userId, address: shortenAddress(normalizedAddress), type: validation.type },
    'Address validated'
  );

  // Upsert user address
  // First, deactivate any existing active addresses for this user
  await prisma.userAddress.updateMany({
    where: {
      tgUserId: userId,
      active: true,
    },
    data: {
      active: false,
    },
  });

  // Create new active address
  await prisma.userAddress.create({
    data: {
      tgUserId: userId,
      address: normalizedAddress,
      addressType: validation.type ?? 'UNKNOWN',
      verified: false,
      active: true,
    },
  });

  // Update flow state
  updateVerifyFlowState(userId, {
    address: normalizedAddress,
    step: 'AWAITING_TX', // Will be set properly when session is created in T-022
  });

  // Show proceed button
  await ctx.reply(
    `*Address Received*\n\n` +
      `Address: \`${shortenAddress(normalizedAddress, 12)}\`\n` +
      `Type: ${validation.type}\n\n` +
      `Next, you'll need to prove you control this address by sending a small amount.\n\n` +
      `Click "Proceed to Verification" when ready.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Proceed to Verification', `verify_proceed:${state.groupId}`)],
        [Markup.button.callback('Use Different Address', 'verify_change_address')],
        [Markup.button.callback('Cancel', 'verify_cancel')],
      ]),
    }
  );

  logger.info({ userId, groupId: state.groupId }, 'Address captured, awaiting proceed');
}
