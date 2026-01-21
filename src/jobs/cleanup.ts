/**
 * Session Cleanup Job
 *
 * Marks expired PENDING verify sessions as EXPIRED
 */

import { prisma } from '../db/client.js';
import { createChildLogger } from '../util/logger.js';

const logger = createChildLogger('jobs:cleanup');

/**
 * Run session cleanup - mark expired sessions as EXPIRED
 */
export async function runSessionCleanupJob(): Promise<void> {
  logger.debug('Running session cleanup job');

  const result = await prisma.verifySession.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: {
        lt: new Date(),
      },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  if (result.count > 0) {
    logger.info({ count: result.count }, 'Expired verify sessions cleaned up');

    // Note: We don't create individual audit logs for session expiry
    // as it would be too verbose. The session record itself shows the status change.
  }
}

/**
 * Clean up old audit logs (optional, for long-running bots)
 * Keeps logs for the last N days
 */
export async function runAuditLogCleanupJob(retentionDays = 30): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  if (result.count > 0) {
    logger.info({ count: result.count, retentionDays }, 'Old audit logs cleaned up');
  }
}

/**
 * Clean up stale flow states
 * This is handled in-memory by the verify/state module, but this can clean
 * any orphaned data if needed
 */
export async function runFlowStateCleanupJob(): Promise<void> {
  // Import and call the cleanup function
  const { clearExpiredVerifyFlowStates } = await import('../verify/state.js');
  const cleared = clearExpiredVerifyFlowStates();

  if (cleared > 0) {
    logger.info({ count: cleared }, 'Expired flow states cleared');
  }
}
