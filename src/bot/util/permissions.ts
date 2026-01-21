import type { Context } from 'telegraf';
import { createChildLogger } from '../../util/logger.js';

const logger = createChildLogger('bot:util:permissions');

export interface BotPermissions {
  can_manage_chat: boolean;
  can_delete_messages: boolean;
  can_restrict_members: boolean;
  can_promote_members: boolean;
  can_change_info: boolean;
  can_invite_users: boolean;
  can_pin_messages: boolean;
  can_manage_video_chats: boolean;
}

export async function isGroupAdmin(ctx: Context, chatId: number, userId: number): Promise<boolean> {
  try {
    const member = await ctx.telegram.getChatMember(chatId, userId);
    return member.status === 'creator' || member.status === 'administrator';
  } catch (error) {
    logger.error({ error, chatId, userId }, 'Failed to check admin status');
    return false;
  }
}

export async function getBotPermissions(
  ctx: Context,
  chatId: number
): Promise<BotPermissions | null> {
  try {
    const botInfo = await ctx.telegram.getMe();
    const member = await ctx.telegram.getChatMember(chatId, botInfo.id);

    if (member.status !== 'administrator') {
      logger.info({ chatId, status: member.status }, 'Bot is not an admin');
      return null;
    }

    // Type guard for administrator
    if (member.status === 'administrator') {
      return {
        can_manage_chat: member.can_manage_chat ?? false,
        can_delete_messages: member.can_delete_messages ?? false,
        can_restrict_members: member.can_restrict_members ?? false,
        can_promote_members: member.can_promote_members ?? false,
        can_change_info: member.can_change_info ?? false,
        can_invite_users: member.can_invite_users ?? false,
        can_pin_messages: member.can_pin_messages ?? false,
        can_manage_video_chats: member.can_manage_video_chats ?? false,
      };
    }

    return null;
  } catch (error) {
    logger.error({ error, chatId }, 'Failed to get bot permissions');
    return null;
  }
}

export async function isBotAdmin(ctx: Context, chatId: number): Promise<boolean> {
  const permissions = await getBotPermissions(ctx, chatId);
  return permissions !== null;
}
