import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';

const logger = createChildLogger('bot:cmd:help');

const USER_HELP = `
*BCHubKey Help*

*User Commands:*
• /status - Check verification status and balances
• /link - Change your BCH address (requires re-verification)
• /verify - Restart ownership proof
• /recheck - Request immediate Gate Check
• /help - Show this help
• /privacy - Data we store

*How It Works:*
1. Click the verification link from a group
2. Submit your BCH address (cashaddr)
3. Complete Ownership Proof (micro-transaction)
4. Gate Check runs automatically
5. Access granted if you hold required tokens
`.trim();

const ADMIN_HELP = `
*BCHubKey Admin Help*

*Admin Commands:*
• /setup - Configure token gating
• /settings - Show current gate settings
• /gate set <tokenId> <min> - Update gate token
• /gate mode <join|restrict> - Set join mode
• /gate grace <minutes> - Set grace period
• /gate interval <minutes> - Set recheck interval
• /members - PASS/FAIL/PENDING summary
• /audit <@user or id> - User details
• /export - Export membership CSV
• /pause /resume - Pause/resume enforcement
• /banfail on|off - Restrict vs Remove on fail

*Setup Steps:*
1. Add bot to group as admin
2. Grant restrict and ban permissions
3. Run /setup to configure gating
4. Pin the verification deep link
`.trim();

export async function handleHelp(ctx: Context) {
  const userId = ctx.from?.id;
  const chatType = ctx.chat?.type;

  logger.info({ userId, chatType }, '/help command received');

  if (chatType === 'private') {
    // DM - show user help
    await ctx.reply(USER_HELP, { parse_mode: 'Markdown' });
  } else {
    // Group - show admin help
    await ctx.reply(ADMIN_HELP, { parse_mode: 'Markdown' });
  }
}
