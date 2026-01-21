/**
 * Telegram Enforcement Module
 *
 * Applies gate decisions via Telegram API:
 * - Approve/decline join requests
 * - Restrict/unrestrict members
 * - Kick members
 */

import { prisma } from '../db/client.js';
import { getBot } from '../bot/index.js';
import { createChildLogger } from '../util/logger.js';
import type { GroupMode, ActionOnFail } from '../generated/prisma/client.js';

const logger = createChildLogger('gate:enforce');

export interface EnforceResult {
  success: boolean;
  action: 'APPROVE_JOIN' | 'RESTRICT' | 'UNRESTRICT' | 'KICK' | 'NONE';
  error?: string;
}

/**
 * Apply enforcement action based on gate pass/fail and group mode
 */
export async function enforceGateResult(
  tgUserId: string,
  groupId: string,
  pass: boolean,
  groupMode: GroupMode,
  actionOnFail: ActionOnFail = 'RESTRICT'
): Promise<EnforceResult> {
  const bot = getBot();
  if (!bot) {
    logger.error('Bot not initialized');
    return { success: false, action: 'NONE', error: 'Bot not initialized' };
  }

  const chatId = BigInt(groupId);
  const userId = BigInt(tgUserId);

  try {
    if (pass) {
      // User passed - grant access
      if (groupMode === 'JOIN_REQUEST') {
        return await approveJoinRequest(bot, chatId, userId, groupId, tgUserId);
      } else {
        return await unrestrictMember(bot, chatId, userId, groupId, tgUserId);
      }
    } else {
      // User failed - apply enforcement
      if (actionOnFail === 'KICK') {
        return await kickMember(bot, chatId, userId, groupId, tgUserId);
      } else {
        return await restrictMember(bot, chatId, userId, groupId, tgUserId);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMsg, tgUserId, groupId, pass }, 'Enforcement failed');
    return { success: false, action: 'NONE', error: errorMsg };
  }
}

/**
 * Approve a pending join request
 */
async function approveJoinRequest(
  bot: ReturnType<typeof getBot>,
  chatId: bigint,
  userId: bigint,
  groupId: string,
  tgUserId: string
): Promise<EnforceResult> {
  if (!bot) {
    return { success: false, action: 'NONE', error: 'Bot not initialized' };
  }

  try {
    await bot.telegram.approveChatJoinRequest(Number(chatId), Number(userId));

    // Update membership enforced status
    await prisma.membership.updateMany({
      where: { tgUserId, groupId },
      data: { enforced: 'NONE' },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId,
        tgUserId,
        type: 'UNRESTRICT', // Using UNRESTRICT for join approval
        payloadJson: JSON.stringify({
          action: 'APPROVE_JOIN_REQUEST',
        }),
      },
    });

    logger.info({ tgUserId, groupId }, 'Approved join request');
    return { success: true, action: 'APPROVE_JOIN' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    // Join request may not exist (user already in group or never requested)
    if (errorMsg.includes('USER_ALREADY_PARTICIPANT') || errorMsg.includes('HIDE_REQUESTER_MISSING')) {
      logger.debug({ tgUserId, groupId }, 'No pending join request to approve');
      return { success: true, action: 'NONE' };
    }

    logger.error({ error: errorMsg, tgUserId, groupId }, 'Failed to approve join request');
    return { success: false, action: 'APPROVE_JOIN', error: errorMsg };
  }
}

/**
 * Unrestrict a member (allow sending messages)
 */
async function unrestrictMember(
  bot: ReturnType<typeof getBot>,
  chatId: bigint,
  userId: bigint,
  groupId: string,
  tgUserId: string
): Promise<EnforceResult> {
  if (!bot) {
    return { success: false, action: 'NONE', error: 'Bot not initialized' };
  }

  try {
    // Get current membership to check if already unrestricted
    const membership = await prisma.membership.findUnique({
      where: {
        tgUserId_groupId: { tgUserId, groupId },
      },
    });

    if (membership?.enforced === 'NONE') {
      logger.debug({ tgUserId, groupId }, 'User already unrestricted');
      return { success: true, action: 'NONE' };
    }

    // Unrestrict by setting default permissions
    await bot.telegram.restrictChatMember(Number(chatId), Number(userId), {
      permissions: {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
        can_change_info: false,
        can_invite_users: true,
        can_pin_messages: false,
        can_manage_topics: false,
      },
    });

    // Update membership
    await prisma.membership.updateMany({
      where: { tgUserId, groupId },
      data: {
        enforced: 'NONE',
        failDetectedAt: null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId,
        tgUserId,
        type: 'UNRESTRICT',
        payloadJson: JSON.stringify({
          action: 'UNRESTRICT_MEMBER',
        }),
      },
    });

    logger.info({ tgUserId, groupId }, 'Unrestricted member');
    return { success: true, action: 'UNRESTRICT' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    // User may not be in the group
    if (errorMsg.includes('user is not a member')) {
      logger.debug({ tgUserId, groupId }, 'User not in group, nothing to unrestrict');
      return { success: true, action: 'NONE' };
    }

    logger.error({ error: errorMsg, tgUserId, groupId }, 'Failed to unrestrict member');
    return { success: false, action: 'UNRESTRICT', error: errorMsg };
  }
}

/**
 * Restrict a member (read-only mode)
 */
async function restrictMember(
  bot: ReturnType<typeof getBot>,
  chatId: bigint,
  userId: bigint,
  groupId: string,
  tgUserId: string
): Promise<EnforceResult> {
  if (!bot) {
    return { success: false, action: 'NONE', error: 'Bot not initialized' };
  }

  try {
    // Restrict to read-only
    await bot.telegram.restrictChatMember(Number(chatId), Number(userId), {
      permissions: {
        can_send_messages: false,
        can_send_audios: false,
        can_send_documents: false,
        can_send_photos: false,
        can_send_videos: false,
        can_send_video_notes: false,
        can_send_voice_notes: false,
        can_send_polls: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
        can_change_info: false,
        can_invite_users: false,
        can_pin_messages: false,
        can_manage_topics: false,
      },
    });

    // Update membership
    await prisma.membership.updateMany({
      where: { tgUserId, groupId },
      data: { enforced: 'RESTRICTED' },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId,
        tgUserId,
        type: 'RESTRICT',
        payloadJson: JSON.stringify({
          action: 'RESTRICT_MEMBER',
          reason: 'Token gate failed',
        }),
      },
    });

    logger.info({ tgUserId, groupId }, 'Restricted member');
    return { success: true, action: 'RESTRICT' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    if (errorMsg.includes('user is not a member')) {
      logger.debug({ tgUserId, groupId }, 'User not in group, nothing to restrict');
      return { success: true, action: 'NONE' };
    }

    logger.error({ error: errorMsg, tgUserId, groupId }, 'Failed to restrict member');
    return { success: false, action: 'RESTRICT', error: errorMsg };
  }
}

/**
 * Kick a member from the group
 */
async function kickMember(
  bot: ReturnType<typeof getBot>,
  chatId: bigint,
  userId: bigint,
  groupId: string,
  tgUserId: string
): Promise<EnforceResult> {
  if (!bot) {
    return { success: false, action: 'NONE', error: 'Bot not initialized' };
  }

  try {
    // Ban then unban to allow rejoining
    await bot.telegram.banChatMember(Number(chatId), Number(userId));

    // Immediately unban to allow rejoining after re-verification
    await bot.telegram.unbanChatMember(Number(chatId), Number(userId), {
      only_if_banned: true,
    });

    // Update membership
    await prisma.membership.updateMany({
      where: { tgUserId, groupId },
      data: { enforced: 'KICKED' },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId,
        tgUserId,
        type: 'KICK',
        payloadJson: JSON.stringify({
          action: 'KICK_MEMBER',
          reason: 'Token gate failed',
        }),
      },
    });

    logger.info({ tgUserId, groupId }, 'Kicked member');
    return { success: true, action: 'KICK' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    if (errorMsg.includes('user is not a member')) {
      logger.debug({ tgUserId, groupId }, 'User not in group, nothing to kick');
      return { success: true, action: 'NONE' };
    }

    logger.error({ error: errorMsg, tgUserId, groupId }, 'Failed to kick member');
    return { success: false, action: 'KICK', error: errorMsg };
  }
}

/**
 * Notify user about gate result via DM
 */
export async function notifyUserGateResult(
  tgUserId: string,
  groupTitle: string,
  pass: boolean,
  balance: string,
  threshold: string,
  gateType: string
): Promise<boolean> {
  const bot = getBot();
  if (!bot) {
    logger.error('Bot not initialized');
    return false;
  }

  try {
    const unit = gateType === 'FT' ? 'tokens' : 'NFTs';

    if (pass) {
      await bot.telegram.sendMessage(
        Number(tgUserId),
        `*Token Gate Passed!* ✅\n\n` +
          `Group: ${groupTitle}\n` +
          `Your balance: ${balance} ${unit}\n` +
          `Required: ${threshold} ${unit}\n\n` +
          `You now have access to the group.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await bot.telegram.sendMessage(
        Number(tgUserId),
        `*Token Gate Failed* ❌\n\n` +
          `Group: ${groupTitle}\n` +
          `Your balance: ${balance} ${unit}\n` +
          `Required: ${threshold} ${unit}\n\n` +
          `You need more tokens to access this group.`,
        { parse_mode: 'Markdown' }
      );
    }

    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMsg, tgUserId }, 'Failed to notify user');
    return false;
  }
}
