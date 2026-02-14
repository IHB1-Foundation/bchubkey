// Admin auth/authorization audit logging

import { prisma } from '../db/client.js';
import { createChildLogger } from '../util/logger.js';

const logger = createChildLogger('admin:audit');

// Admin audit events use a special groupId since they aren't group-scoped.
// We use the first group the admin has access to, or a sentinel value.
const SYSTEM_GROUP_SENTINEL = '__system__';

interface AdminAuditEvent {
  type: 'ADMIN_LOGIN' | 'ADMIN_LOGOUT' | 'ADMIN_AUTH_FAIL' | 'ADMIN_AUTHZ_DENY' | 'ADMIN_SESSION_REFRESH';
  adminUserId?: string;
  tgUserId?: string;
  groupId?: string;
  payload?: Record<string, unknown>;
}

/**
 * Log an admin authentication/authorization event.
 * Uses the first available group for groupId (required by audit_logs schema),
 * or creates a minimal record using a system sentinel.
 */
export async function logAdminAudit(event: AdminAuditEvent): Promise<void> {
  try {
    // Determine groupId: use provided, or find first group, or sentinel
    let groupId = event.groupId;
    if (!groupId && event.adminUserId) {
      const ga = await prisma.groupAdmin.findFirst({
        where: { adminUserId: event.adminUserId },
        select: { groupId: true },
      });
      groupId = ga?.groupId;
    }
    if (!groupId) {
      // Use first available group or create sentinel reference
      const firstGroup = await prisma.group.findFirst({ select: { id: true } });
      groupId = firstGroup?.id ?? SYSTEM_GROUP_SENTINEL;
    }

    // Ensure groupId exists (audit_logs has FK constraint to groups)
    const groupExists = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    });

    if (!groupExists) {
      // Can't write audit log without valid group FK — log to structured logger instead
      logger.warn(
        { event: event.type, adminUserId: event.adminUserId, tgUserId: event.tgUserId, payload: event.payload },
        'Admin audit event (no group for FK)'
      );
      return;
    }

    await prisma.auditLog.create({
      data: {
        groupId,
        tgUserId: event.tgUserId ?? null,
        type: event.type,
        payloadJson: JSON.stringify({
          adminUserId: event.adminUserId,
          ...event.payload,
        }),
      },
    });
  } catch (err) {
    // Audit logging should never crash the request
    logger.error({ err, event: event.type }, 'Failed to write admin audit log');
  }
}
