import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';
import { isGroupAdmin, getBotPermissions, type BotPermissions } from '../util/permissions.js';

const logger = createChildLogger('bot:cmd:setup');

const REQUIRED_BOT_PERMISSIONS: (keyof BotPermissions)[] = [
  'can_restrict_members',
  'can_invite_users',
];

export async function handleSetup(ctx: Context) {
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;
  const userId = ctx.from?.id;

  logger.info({ chatId, chatType, userId }, '/setup command received');

  // Only allow in groups/supergroups
  if (chatType !== 'group' && chatType !== 'supergroup') {
    await ctx.reply('The /setup command can only be used in groups.');
    return;
  }

  if (!chatId || !userId) {
    logger.error({ chatId, userId }, 'Missing chat or user ID');
    return;
  }

  // Check if caller is admin
  const isAdmin = await isGroupAdmin(ctx, chatId, userId);
  if (!isAdmin) {
    await ctx.reply('Only group admins can run /setup.');
    logger.info({ chatId, userId }, 'Non-admin attempted /setup');
    return;
  }

  // Check bot permissions
  const botPermissions = await getBotPermissions(ctx, chatId);
  if (!botPermissions) {
    await ctx.reply(
      'I need to be an admin in this group to set up token gating.\n\n' +
        'Please make me an admin with these permissions:\n' +
        '• Restrict members\n' +
        '• Invite users via link'
    );
    return;
  }

  // Check required permissions
  const missingPermissions: string[] = [];
  for (const perm of REQUIRED_BOT_PERMISSIONS) {
    if (!botPermissions[perm]) {
      missingPermissions.push(formatPermissionName(perm));
    }
  }

  if (missingPermissions.length > 0) {
    await ctx.reply(
      `I'm missing some required permissions:\n\n` +
        missingPermissions.map((p) => `• ${p}`).join('\n') +
        `\n\nPlease update my admin permissions and try again.`
    );
    logger.info({ chatId, missingPermissions }, 'Bot missing required permissions');
    return;
  }

  // All checks passed - show setup wizard button
  const chatTitle = ctx.chat && 'title' in ctx.chat ? ctx.chat.title : 'this group';

  await ctx.reply(
    `Ready to configure token gating for *${escapeMarkdown(chatTitle)}*!\n\n` +
      `Click the button below to continue setup in a private chat with me.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('Open Setup Wizard', `setup_wizard:${chatId}`)],
      ]),
    }
  );

  logger.info({ chatId, userId }, 'Setup wizard button posted');
}

function formatPermissionName(perm: keyof BotPermissions): string {
  const names: Record<keyof BotPermissions, string> = {
    can_manage_chat: 'Manage chat',
    can_delete_messages: 'Delete messages',
    can_restrict_members: 'Restrict members',
    can_promote_members: 'Add admins',
    can_change_info: 'Change group info',
    can_invite_users: 'Invite users via link',
    can_pin_messages: 'Pin messages',
    can_manage_video_chats: 'Manage video chats',
  };
  return names[perm] ?? perm;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
