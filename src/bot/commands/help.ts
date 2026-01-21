import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';

const logger = createChildLogger('bot:cmd:help');

const USER_HELP = `
*BCHubKey Help*

*User Commands:*
/status - Check your verification status and token balances
/link - Link or change your BCH address (requires re-verification)
/verify - Restart ownership verification
/recheck - Request immediate token balance re-check
/help - Show this help message
/privacy - Learn what data we store

*How it works:*
1. Click the verification deep link from a group
2. Submit your BCH address (cashaddr format)
3. Send a small amount to prove ownership
4. Token balance is checked automatically
5. Access is granted or denied based on holdings
`.trim();

const ADMIN_HELP = `
*BCHubKey Admin Help*

*Admin Commands:*
/setup - Configure token gating for this group
/settings - Show current gate settings
/gate set <tokenId> <min> - Quick update gate token and minimum
/gate mode <join|restrict> - Set join handling mode
/gate grace <minutes> - Set grace period
/gate interval <minutes> - Set recheck interval
/members - Show PASS/FAIL/PENDING member summary
/audit <@user or id> - Show user verification details
/export - Export membership data as CSV
/pause - Pause enforcement
/resume - Resume enforcement
/banfail on|off - Toggle restrict vs kick on fail

*Setup steps:*
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
