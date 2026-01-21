import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import { getWizardState, updateWizardState, updateWizardData, deleteWizardState } from './state.js';
import { saveGroupConfig } from './save.js';
import type { GateType, GroupMode, ActionOnFail } from '../../generated/prisma/client.js';

const logger = createChildLogger('bot:wizard:handlers');

export async function handleWizardCallback(ctx: Context, action: string, data: string[]) {
  const userId = ctx.from?.id?.toString();
  if (!userId) {
    await ctx.answerCbQuery('Invalid request');
    return;
  }

  const state = getWizardState(userId);
  if (!state) {
    await ctx.answerCbQuery('Session expired. Please start /setup again.');
    return;
  }

  await ctx.answerCbQuery();

  switch (action) {
    case 'wizard_gate_type':
      await handleGateTypeSelection(ctx, userId, data[0] as GateType);
      break;

    case 'wizard_mode':
      await handleModeSelection(ctx, userId, data[0] as GroupMode);
      break;

    case 'wizard_action':
      await handleActionSelection(ctx, userId, data[0] as ActionOnFail);
      break;

    case 'wizard_confirm':
      await handleConfirmation(ctx, userId);
      break;

    case 'wizard_cancel':
      await handleCancel(ctx, userId);
      break;

    case 'wizard_use_defaults':
      await handleUseDefaults(ctx, userId);
      break;

    default:
      logger.warn({ action, data }, 'Unknown wizard action');
  }
}

async function handleGateTypeSelection(ctx: Context, userId: string, gateType: GateType) {
  updateWizardData(userId, { gateType });
  updateWizardState(userId, { step: 'TOKEN_ID' });

  await ctx.editMessageText(
    `*Step 2: Token Category ID*\n\n` +
      `Enter the CashToken category ID (hex format).\n\n` +
      `This is the unique identifier for the token you want to gate with.`,
    { parse_mode: 'Markdown' }
  );

  logger.info({ userId, gateType }, 'Gate type selected');
}

async function handleModeSelection(ctx: Context, userId: string, mode: GroupMode) {
  updateWizardData(userId, { mode });
  updateWizardState(userId, { step: 'RECHECK_INTERVAL' });

  await ctx.editMessageText(
    `*Step 5: Recheck Interval*\n\n` +
      `How often should token balances be re-checked?\n\n` +
      `Enter a number of minutes (e.g., 60 for hourly).\n` +
      `Recommended: 5-60 minutes for demo, longer for production.`,
    { parse_mode: 'Markdown' }
  );

  logger.info({ userId, mode }, 'Join mode selected');
}

async function handleActionSelection(ctx: Context, userId: string, actionOnFail: ActionOnFail) {
  updateWizardData(userId, { actionOnFail });
  updateWizardState(userId, { step: 'VERIFY_ADDRESS' });

  await ctx.editMessageText(
    `*Step 7: Verification Address*\n\n` +
      `Enter the BCH address where users will send micro-transactions for ownership proof.\n\n` +
      `This should be a cashaddr format address (starting with bitcoincash:).\n` +
      `You control this address - it receives tiny amounts for verification.`,
    { parse_mode: 'Markdown' }
  );

  logger.info({ userId, actionOnFail }, 'Action on fail selected');
}

async function handleConfirmation(ctx: Context, userId: string) {
  const state = getWizardState(userId);
  if (!state) {
    await ctx.reply('Session expired. Please start /setup again.');
    return;
  }

  try {
    const result = await saveGroupConfig(state);

    updateWizardState(userId, { step: 'DONE' });
    deleteWizardState(userId);

    const deepLink = `https://t.me/${process.env.BOT_PUBLIC_NAME ?? 'YourBot'}?start=g_${state.groupId}_${result.setupCode}`;

    await ctx.editMessageText(
      `*Setup Complete!*\n\n` +
        `Token gating is now configured for *${escapeMarkdown(state.groupTitle)}*.\n\n` +
        `*Verification Deep Link:*\n\`${deepLink}\`\n\n` +
        `Share this link with members who need to verify their token holdings.\n` +
        `You can pin a message with this link in your group.\n\n` +
        `Use /settings in the group to view the current configuration.`,
      { parse_mode: 'Markdown' }
    );

    logger.info({ userId, groupId: state.groupId }, 'Wizard completed successfully');
  } catch (error) {
    logger.error({ error, userId }, 'Failed to save group config');
    await ctx.editMessageText(
      `*Error*\n\nFailed to save configuration. Please try again.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { parse_mode: 'Markdown' }
    );
  }
}

async function handleCancel(ctx: Context, userId: string) {
  deleteWizardState(userId);

  await ctx.editMessageText(
    `*Setup Cancelled*\n\nNo changes were saved. Run /setup in your group to start again.`,
    { parse_mode: 'Markdown' }
  );

  logger.info({ userId }, 'Wizard cancelled');
}

async function handleUseDefaults(ctx: Context, userId: string) {
  const state = getWizardState(userId);
  if (!state) {
    await ctx.reply('Session expired.');
    return;
  }

  // Set defaults
  updateWizardData(userId, {
    verifyMinSat: 2000,
    verifyMaxSat: 2999,
    verifyExpireMin: 10,
  });
  updateWizardState(userId, { step: 'CONFIRM' });

  await sendConfirmationStep(ctx, userId);
}

export async function handleWizardTextInput(ctx: Context) {
  const userId = ctx.from?.id?.toString();
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;

  if (!userId || !text) return;

  // Check for /cancel command
  if (text === '/cancel') {
    const state = getWizardState(userId);
    if (state) {
      deleteWizardState(userId);
      await ctx.reply('Setup cancelled. Run /setup in your group to start again.');
    }
    return;
  }

  const state = getWizardState(userId);
  if (!state) return;

  logger.info({ userId, step: state.step, text }, 'Wizard text input received');

  switch (state.step) {
    case 'TOKEN_ID':
      await handleTokenIdInput(ctx, userId, text);
      break;

    case 'THRESHOLD':
      await handleThresholdInput(ctx, userId, text);
      break;

    case 'RECHECK_INTERVAL':
      await handleRecheckIntervalInput(ctx, userId, text);
      break;

    case 'GRACE_PERIOD':
      await handleGracePeriodInput(ctx, userId, text);
      break;

    case 'VERIFY_ADDRESS':
      await handleVerifyAddressInput(ctx, userId, text);
      break;

    case 'VERIFY_AMOUNT_RANGE':
      await handleVerifyAmountRangeInput(ctx, userId, text);
      break;
  }
}

async function handleTokenIdInput(ctx: Context, userId: string, text: string) {
  // Basic validation - should be hex string
  const tokenId = text.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(tokenId)) {
    await ctx.reply(
      'Invalid token category ID. Please enter a 64-character hex string.\n\n' +
        'Example: `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  updateWizardData(userId, { tokenId });

  const state = getWizardState(userId);
  if (!state) return;

  updateWizardState(userId, { step: 'THRESHOLD' });

  if (state.data.gateType === 'FT') {
    await ctx.reply(
      `*Step 3: Minimum Token Amount*\n\n` +
        `Enter the minimum amount of tokens required.\n\n` +
        `You can enter:\n` +
        `• A plain number (e.g., \`100\`)\n` +
        `• A number with decimals (e.g., \`0.001\`)\n\n` +
        `If you know the token's decimals, enter them after a space:\n` +
        `• \`100 8\` means 100 tokens with 8 decimals`,
      { parse_mode: 'Markdown' }
    );
  } else {
    await ctx.reply(
      `*Step 3: Minimum NFT Count*\n\n` +
        `Enter the minimum number of NFTs required.\n\n` +
        `Example: \`1\` for at least one NFT`,
      { parse_mode: 'Markdown' }
    );
  }
}

async function handleThresholdInput(ctx: Context, userId: string, text: string) {
  const state = getWizardState(userId);
  if (!state) return;

  if (state.data.gateType === 'FT') {
    // Parse FT amount - format: "amount" or "amount decimals"
    const parts = text.trim().split(/\s+/);
    const amountStr = parts[0];
    const decimals = parts[1] ? parseInt(parts[1], 10) : 0;

    if (!amountStr || isNaN(parseFloat(amountStr))) {
      await ctx.reply('Invalid amount. Please enter a valid number.');
      return;
    }

    if (parts[1] && (isNaN(decimals) || decimals < 0 || decimals > 18)) {
      await ctx.reply('Invalid decimals. Please enter a number between 0 and 18.');
      return;
    }

    // Convert to base units
    const amount = parseFloat(amountStr);
    const minAmountBase = Math.floor(amount * Math.pow(10, decimals)).toString();

    updateWizardData(userId, { minAmountBase, decimals });
  } else {
    // Parse NFT count
    const count = parseInt(text.trim(), 10);
    if (isNaN(count) || count < 1) {
      await ctx.reply('Invalid count. Please enter a positive number.');
      return;
    }

    updateWizardData(userId, { minNftCount: count });
  }

  updateWizardState(userId, { step: 'JOIN_MODE' });

  await ctx.reply(
    `*Step 4: Join Handling Mode*\n\n` +
      `How should the bot handle new members?\n\n` +
      `• *Join Request* - Bot approves/declines join requests\n` +
      `• *Restrict* - Members can join but are restricted until verified`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Join Request (Recommended)', 'wizard_mode:JOIN_REQUEST')],
        [Markup.button.callback('Restrict Mode', 'wizard_mode:RESTRICT')],
        [Markup.button.callback('Cancel Setup', 'wizard_cancel')],
      ]),
    }
  );
}

async function handleRecheckIntervalInput(ctx: Context, userId: string, text: string) {
  const minutes = parseInt(text.trim(), 10);
  if (isNaN(minutes) || minutes < 1) {
    await ctx.reply('Invalid interval. Please enter a positive number of minutes.');
    return;
  }

  const recheckIntervalSec = minutes * 60;
  updateWizardData(userId, { recheckIntervalSec });
  updateWizardState(userId, { step: 'GRACE_PERIOD' });

  await ctx.reply(
    `*Step 6: Grace Period*\n\n` +
      `How long should users have to restore their balance before being restricted/kicked?\n\n` +
      `Enter a number of minutes.\n` +
      `• \`0\` = immediate enforcement\n` +
      `• \`60\` = 1 hour grace period`,
    { parse_mode: 'Markdown' }
  );
}

async function handleGracePeriodInput(ctx: Context, userId: string, text: string) {
  const minutes = parseInt(text.trim(), 10);
  if (isNaN(minutes) || minutes < 0) {
    await ctx.reply('Invalid grace period. Please enter a non-negative number of minutes.');
    return;
  }

  const gracePeriodSec = minutes * 60;
  updateWizardData(userId, { gracePeriodSec });
  updateWizardState(userId, { step: 'ACTION_ON_FAIL' });

  await ctx.reply(
    `*Step 6b: Action on Fail*\n\n` +
      `What should happen when a user fails the token check after grace period?\n\n` +
      `• *Restrict* - User becomes read-only\n` +
      `• *Kick* - User is removed from group`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Restrict (Read-only)', 'wizard_action:RESTRICT')],
        [Markup.button.callback('Kick from Group', 'wizard_action:KICK')],
        [Markup.button.callback('Cancel Setup', 'wizard_cancel')],
      ]),
    }
  );
}

async function handleVerifyAddressInput(ctx: Context, userId: string, text: string) {
  const address = text.trim();

  // Basic cashaddr validation
  if (!address.startsWith('bitcoincash:') && !address.startsWith('bchtest:')) {
    await ctx.reply(
      'Invalid address format. Please enter a cashaddr format address.\n\n' +
        'Example: `bitcoincash:qz...`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  updateWizardData(userId, { verifyAddress: address });
  updateWizardState(userId, { step: 'VERIFY_AMOUNT_RANGE' });

  await ctx.reply(
    `*Step 8: Verification Amount Range*\n\n` +
      `Enter the satoshi range for micro-transaction amounts.\n\n` +
      `Format: \`min max\` (e.g., \`2000 2999\`)\n\n` +
      `Default is 2000-2999 sats (~$0.01). This small range helps identify transactions uniquely.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Use Defaults (2000-2999)', 'wizard_use_defaults')],
      ]),
    }
  );
}

async function handleVerifyAmountRangeInput(ctx: Context, userId: string, text: string) {
  const parts = text.trim().split(/\s+/);
  const minSat = parseInt(parts[0] ?? '', 10);
  const maxSat = parseInt(parts[1] ?? '', 10);

  if (isNaN(minSat) || isNaN(maxSat) || minSat < 546 || maxSat <= minSat) {
    await ctx.reply(
      'Invalid range. Format: `min max`\n\n' +
        '• Minimum must be at least 546 sats (dust limit)\n' +
        '• Maximum must be greater than minimum',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  updateWizardData(userId, {
    verifyMinSat: minSat,
    verifyMaxSat: maxSat,
    verifyExpireMin: 10,
  });
  updateWizardState(userId, { step: 'CONFIRM' });

  await sendConfirmationStep(ctx, userId);
}

async function sendConfirmationStep(ctx: Context, userId: string) {
  const state = getWizardState(userId);
  if (!state) return;

  const d = state.data;
  const summary = [
    `*Configuration Summary*`,
    ``,
    `*Group:* ${escapeMarkdown(state.groupTitle)}`,
    `*Gate Type:* ${d.gateType}`,
    `*Token ID:* \`${d.tokenId?.slice(0, 16)}...\``,
    d.gateType === 'FT'
      ? `*Minimum Amount:* ${d.minAmountBase} base units${d.decimals ? ` (${d.decimals} decimals)` : ''}`
      : `*Minimum NFTs:* ${d.minNftCount}`,
    `*Join Mode:* ${d.mode}`,
    `*Recheck Interval:* ${(d.recheckIntervalSec ?? 300) / 60} minutes`,
    `*Grace Period:* ${(d.gracePeriodSec ?? 300) / 60} minutes`,
    `*Action on Fail:* ${d.actionOnFail}`,
    `*Verify Address:* ${d.verifyAddress?.slice(0, 30)}...`,
    `*Verify Amount:* ${d.verifyMinSat}-${d.verifyMaxSat} sats`,
    ``,
    `Is this correct?`,
  ].join('\n');

  await ctx.reply(summary, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('Confirm & Save', 'wizard_confirm')],
      [Markup.button.callback('Cancel Setup', 'wizard_cancel')],
    ]),
  });
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
