/**
 * Token Gate Evaluation Module
 *
 * Evaluates if a user passes the token gate based on their verified address
 * and the group's gate rules.
 */

import { prisma } from '../db/client.js';
import { getChainAdapter } from '../chain/index.js';
import { createChildLogger } from '../util/logger.js';
import type { GateRule, GateType } from '../generated/prisma/client.js';

const logger = createChildLogger('gate:evaluate');

export interface GateEvaluationResult {
  pass: boolean;
  balance: string; // Base units as string (for both FT amount and NFT count)
  threshold: string; // Required threshold
  gateType: GateType;
  tokenId: string;
  address: string;
}

/**
 * Evaluate if a user passes the token gate for a specific group
 */
export async function evaluateGate(
  tgUserId: string,
  groupId: string
): Promise<GateEvaluationResult | null> {
  // Get user's verified active address
  const userAddress = await prisma.userAddress.findFirst({
    where: {
      tgUserId,
      active: true,
      verified: true,
    },
  });

  if (!userAddress) {
    logger.warn({ tgUserId, groupId }, 'No verified address found for user');
    return null;
  }

  // Get gate rule for group
  const gateRule = await prisma.gateRule.findFirst({
    where: { groupId },
    orderBy: { createdAt: 'desc' },
  });

  if (!gateRule) {
    logger.warn({ groupId }, 'No gate rule found for group');
    return null;
  }

  return evaluateGateWithRule(userAddress.address, gateRule);
}

/**
 * Evaluate token gate with a specific rule and address
 */
export async function evaluateGateWithRule(
  address: string,
  gateRule: GateRule
): Promise<GateEvaluationResult> {
  const chain = getChainAdapter();

  let balance: bigint | number;
  let threshold: bigint | number;
  let pass: boolean;

  if (gateRule.gateType === 'FT') {
    // Fungible token check
    balance = await chain.getTokenBalanceFT(address, gateRule.tokenId);
    threshold = BigInt(gateRule.minAmountBase ?? '0');
    pass = balance >= threshold;

    logger.info(
      {
        address,
        tokenId: gateRule.tokenId,
        balance: balance.toString(),
        threshold: threshold.toString(),
        pass,
      },
      'FT gate evaluation'
    );

    return {
      pass,
      balance: balance.toString(),
      threshold: threshold.toString(),
      gateType: 'FT',
      tokenId: gateRule.tokenId,
      address,
    };
  } else {
    // NFT check
    balance = await chain.getTokenBalanceNFTCount(address, gateRule.tokenId);
    threshold = gateRule.minNftCount ?? 1;
    pass = balance >= threshold;

    logger.info(
      {
        address,
        tokenId: gateRule.tokenId,
        balance,
        threshold,
        pass,
      },
      'NFT gate evaluation'
    );

    return {
      pass,
      balance: balance.toString(),
      threshold: threshold.toString(),
      gateType: 'NFT',
      tokenId: gateRule.tokenId,
      address,
    };
  }
}

/**
 * Update membership state based on gate evaluation
 */
export async function updateMembershipState(
  tgUserId: string,
  groupId: string,
  evaluation: GateEvaluationResult
): Promise<void> {
  const newState = evaluation.pass ? 'VERIFIED_PASS' : 'VERIFIED_FAIL';
  const now = new Date();

  // Upsert membership
  await prisma.membership.upsert({
    where: {
      tgUserId_groupId: {
        tgUserId,
        groupId,
      },
    },
    update: {
      state: newState,
      lastBalanceBase: evaluation.balance,
      lastCheckedAt: now,
      // Set failDetectedAt only if transitioning to FAIL
      failDetectedAt: evaluation.pass ? null : now,
    },
    create: {
      tgUserId,
      groupId,
      state: newState,
      lastBalanceBase: evaluation.balance,
      lastCheckedAt: now,
      failDetectedAt: evaluation.pass ? null : now,
      enforced: 'NONE',
    },
  });

  // Create audit log
  const logType = evaluation.pass ? 'GATE_PASS' : 'GATE_FAIL';
  await prisma.auditLog.create({
    data: {
      groupId,
      tgUserId,
      type: logType,
      payloadJson: JSON.stringify({
        address: evaluation.address,
        tokenId: evaluation.tokenId,
        gateType: evaluation.gateType,
        balance: evaluation.balance,
        threshold: evaluation.threshold,
        pass: evaluation.pass,
      }),
    },
  });

  logger.info(
    { tgUserId, groupId, newState, balance: evaluation.balance },
    'Membership state updated'
  );
}
