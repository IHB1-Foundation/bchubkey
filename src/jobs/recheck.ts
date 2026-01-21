/**
 * Periodic Recheck Job
 *
 * Re-evaluates token balance for verified memberships at configured intervals.
 */

import { prisma } from '../db/client.js';
import { evaluateGate, updateMembershipState } from '../gate/index.js';
import { createChildLogger } from '../util/logger.js';

const logger = createChildLogger('jobs:recheck');

/**
 * Run recheck for all groups that are due
 */
export async function runRecheckJob(): Promise<void> {
  logger.debug('Running recheck job');

  // Get all active groups with their gate rules
  const groups = await prisma.group.findMany({
    where: { status: 'ACTIVE' },
    include: {
      gateRules: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  for (const group of groups) {
    if (group.gateRules.length === 0) {
      continue;
    }

    const gateRule = group.gateRules[0];
    const intervalMs = gateRule.recheckIntervalSec * 1000;

    try {
      await recheckGroup(group.id, intervalMs);
    } catch (error) {
      logger.error({ error, groupId: group.id }, 'Recheck failed for group');
    }
  }
}

/**
 * Recheck all memberships for a specific group
 */
async function recheckGroup(groupId: string, intervalMs: number): Promise<void> {
  const cutoffTime = new Date(Date.now() - intervalMs);

  // Get memberships that need recheck
  const memberships = await prisma.membership.findMany({
    where: {
      groupId,
      state: {
        in: ['VERIFIED_PASS', 'VERIFIED_FAIL'],
      },
      OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: cutoffTime } }],
    },
    include: {
      user: {
        include: {
          addresses: {
            where: {
              active: true,
              verified: true,
            },
          },
        },
      },
    },
  });

  if (memberships.length === 0) {
    logger.debug({ groupId }, 'No memberships due for recheck');
    return;
  }

  logger.info({ groupId, count: memberships.length }, 'Rechecking memberships');

  for (const membership of memberships) {
    // Skip if user has no verified address
    if (membership.user.addresses.length === 0) {
      logger.debug({ tgUserId: membership.tgUserId }, 'No verified address, skipping recheck');
      continue;
    }

    try {
      const evaluation = await evaluateGate(membership.tgUserId, groupId);
      if (!evaluation) {
        logger.warn({ tgUserId: membership.tgUserId, groupId }, 'Gate evaluation returned null');
        continue;
      }

      const previousState = membership.state;
      await updateMembershipState(membership.tgUserId, groupId, evaluation);

      // Create recheck audit log
      await prisma.auditLog.create({
        data: {
          groupId,
          tgUserId: membership.tgUserId,
          type: 'RECHECK',
          payloadJson: JSON.stringify({
            previousState,
            newState: evaluation.pass ? 'VERIFIED_PASS' : 'VERIFIED_FAIL',
            balance: evaluation.balance,
            threshold: evaluation.threshold,
          }),
        },
      });

      logger.info(
        {
          tgUserId: membership.tgUserId,
          groupId,
          previousState,
          newPass: evaluation.pass,
        },
        'Membership rechecked'
      );
    } catch (error) {
      logger.error(
        { error, tgUserId: membership.tgUserId, groupId },
        'Failed to recheck membership'
      );
    }
  }
}
