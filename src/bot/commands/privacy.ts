import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';

const logger = createChildLogger('bot:cmd:privacy');

export async function handlePrivacy(ctx: Context) {
  const userId = ctx.from?.id;
  const chatType = ctx.chat?.type;

  logger.info({ userId, chatType }, '/privacy command received');

  const text = [
    `*Privacy Notice*`,
    ``,
    `BCHubKey stores only data required for token-gating operations:`,
    `• Telegram user ID and basic profile (username/first name)`,
    `• Linked BCH address (active/verification status)`,
    `• Group membership state (PASS/FAIL/PENDING)`,
    `• Verification session records and audit logs`,
    ``,
    `BCHubKey does *not* request or store private keys.`,
    `Ownership proof uses an on-chain micro-transaction.`,
    ``,
    `To update your linked address, use /link.`,
  ].join('\n');

  await ctx.reply(text, { parse_mode: 'Markdown' });
}
