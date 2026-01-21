/**
 * Grace Expiry Enforcement Job
 *
 * Enforces restrict/kick on memberships that have failed the gate
 * and exceeded the grace period without recovering.
 */

import { prisma } from '../db/client.js';
import { evaluateGate, updateMembershipState, enforceGateResult } from '../gate/index.js';
import { createChildLogger } from '../util/logger.js';

const logger = createChildLogger('jobs:grace');

/**
 * Run grace expiry enforcement for all groups
 */
export async function runGraceEnforcementJob(): Promise<void> {
  logger.debug('Running grace enforcement job');

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

    try {
      await enforceGraceExpiry(group.id, group.mode, gateRule.gracePeriodSec, gateRule.actionOnFail);
    } catch (error) {
      logger.error({ error, groupId: group.id }, 'Grace enforcement failed for group');
    }
  }
}

/**
 * Enforce grace expiry for a specific group
 */
async function enforceGraceExpiry(
  groupId: string,
  mode: 'JOIN_REQUEST' | 'RESTRICT',
  gracePeriodSec: number,
  actionOnFail: 'RESTRICT' | 'KICK'
): Promise<void> {
  const cutoffTime = new Date(Date.now() - gracePeriodSec * 1000);

  // Get memberships in VERIFIED_FAIL with expired grace
  const memberships = await prisma.membership.findMany({
    where: {
      groupId,
      state: 'VERIFIED_FAIL',
      failDetectedAt: {
        lt: cutoffTime,
      },
      enforced: 'NONE', // Only enforce if not already enforced
    },
  });

  if (memberships.length === 0) {
    logger.debug({ groupId }, 'No memberships with expired grace');
    return;
  }

  logger.info({ groupId, count: memberships.length }, 'Processing expired grace memberships');

  for (const membership of memberships) {
    try {
      // Re-evaluate gate to confirm still failing
      const evaluation = await evaluateGate(membership.tgUserId, groupId);

      if (!evaluation) {
        logger.warn({ tgUserId: membership.tgUserId }, 'Cannot re-evaluate, skipping enforcement');
        continue;
      }

      if (evaluation.pass) {
        // User has recovered - update to PASS
        await updateMembershipState(membership.tgUserId, groupId, evaluation);
        logger.info({ tgUserId: membership.tgUserId, groupId }, 'User recovered during grace, now PASS');
        continue;
      }

      // Still failing - apply enforcement
      const result = await enforceGateResult(
        membership.tgUserId,
        groupId,
        false,
        mode,
        actionOnFail
      );

      // Create audit log for grace expiry enforcement
      await prisma.auditLog.create({
        data: {
          groupId,
          tgUserId: membership.tgUserId,
          type: 'GRACE_EXPIRED',
          payloadJson: JSON.stringify({
            gracePeriodSec,
            failDetectedAt: membership.failDetectedAt?.toISOString(),
            action: result.action,
            success: result.success,
          }),
        },
      });

      logger.info(
        {
          tgUserId: membership.tgUserId,
          groupId,
          action: result.action,
          success: result.success,
        },
        'Grace expiry enforcement applied'
      );
    } catch (error) {
      logger.error(
        { error, tgUserId: membership.tgUserId, groupId },
        'Failed to enforce grace expiry'
      );
    }
  }
}

/**
 * Check and start grace period for memberships that just failed
 *
 * This should be called when a membership transitions from PASS to FAIL
 */
export async function startGracePeriod(
  tgUserId: string,
  groupId: string,
  gracePeriodSec: number
): Promise<void> {
  // If grace period is 0, don't set failDetectedAt (immediate enforcement handled elsewhere)
  if (gracePeriodSec === 0) {
    return;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      tgUserId_groupId: { tgUserId, groupId },
    },
  });

  if (!membership || membership.state !== 'VERIFIED_FAIL') {
    return;
  }

  // Set failDetectedAt if not already set
  if (!membership.failDetectedAt) {
    await prisma.membership.update({
      where: { id: membership.id },
      data: { failDetectedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        groupId,
        tgUserId,
        type: 'GRACE_START',
        payloadJson: JSON.stringify({
          gracePeriodSec,
        }),
      },
    });

    logger.info({ tgUserId, groupId, gracePeriodSec }, 'Grace period started');
  }
}
