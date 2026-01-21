/**
 * Gate module exports
 *
 * Token gating evaluation and enforcement
 */

export {
  evaluateGate,
  evaluateGateWithRule,
  updateMembershipState,
  type GateEvaluationResult,
} from './evaluate.js';

export { enforceGateResult, notifyUserGateResult, type EnforceResult } from './enforce.js';

import { prisma } from '../db/client.js';
import { evaluateGate, updateMembershipState } from './evaluate.js';
import { enforceGateResult, notifyUserGateResult } from './enforce.js';
import { createChildLogger } from '../util/logger.js';

const logger = createChildLogger('gate');

/**
 * Process gate check after successful ownership verification
 *
 * This is the main entry point called after a verify session completes successfully.
 */
export async function processGateCheck(tgUserId: string, groupId: string): Promise<void> {
  logger.info({ tgUserId, groupId }, 'Processing gate check');

  // Get group and rule
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      gateRules: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!group || group.gateRules.length === 0) {
    logger.error({ groupId }, 'Group or gate rule not found');
    return;
  }

  const gateRule = group.gateRules[0];

  // Check if group is paused
  if (group.status === 'PAUSED') {
    logger.info({ groupId }, 'Group enforcement is paused, skipping');
    return;
  }

  // Evaluate gate
  const evaluation = await evaluateGate(tgUserId, groupId);
  if (!evaluation) {
    logger.error({ tgUserId, groupId }, 'Gate evaluation failed - no verified address');
    return;
  }

  // Update membership state
  await updateMembershipState(tgUserId, groupId, evaluation);

  // Apply enforcement
  const enforceResult = await enforceGateResult(
    tgUserId,
    groupId,
    evaluation.pass,
    group.mode,
    gateRule.actionOnFail
  );

  logger.info(
    {
      tgUserId,
      groupId,
      pass: evaluation.pass,
      enforceAction: enforceResult.action,
      enforceSuccess: enforceResult.success,
    },
    'Gate check complete'
  );

  // Notify user
  await notifyUserGateResult(
    tgUserId,
    group.title,
    evaluation.pass,
    evaluation.balance,
    evaluation.threshold,
    evaluation.gateType
  );
}
