import { randomBytes } from 'crypto';
import { prisma } from '../../db/client.js';
import { createChildLogger } from '../../util/logger.js';
import type { WizardState } from './state.js';

const logger = createChildLogger('bot:wizard:save');

// Defaults from environment (for demo mode customization)
const DEFAULT_RECHECK_INTERVAL_SEC = parseInt(process.env.DEFAULT_RECHECK_INTERVAL_SEC ?? '300', 10);
const DEFAULT_GRACE_PERIOD_SEC = parseInt(process.env.DEFAULT_GRACE_PERIOD_SEC ?? '300', 10);
const DEFAULT_VERIFY_MIN_SAT = parseInt(process.env.DEFAULT_VERIFY_MIN_SAT ?? '2000', 10);
const DEFAULT_VERIFY_MAX_SAT = parseInt(process.env.DEFAULT_VERIFY_MAX_SAT ?? '2999', 10);
const DEFAULT_VERIFY_EXPIRE_MIN = parseInt(process.env.DEFAULT_VERIFY_EXPIRE_MIN ?? '10', 10);

export interface SaveResult {
  groupId: string;
  setupCode: string;
}

export async function saveGroupConfig(state: WizardState): Promise<SaveResult> {
  const { groupId, groupTitle, data } = state;

  // Generate unique setup code
  const setupCode = randomBytes(8).toString('hex');

  logger.info({ groupId, groupTitle }, 'Saving group configuration');

  // Upsert group
  await prisma.group.upsert({
    where: { id: groupId },
    update: {
      title: groupTitle,
      setupCode,
      mode: data.mode ?? 'JOIN_REQUEST',
      status: 'ACTIVE',
    },
    create: {
      id: groupId,
      title: groupTitle,
      type: 'supergroup',
      setupCode,
      mode: data.mode ?? 'JOIN_REQUEST',
      status: 'ACTIVE',
    },
  });

  // Delete existing gate rules for this group
  await prisma.gateRule.deleteMany({
    where: { groupId },
  });

  // Create new gate rule
  await prisma.gateRule.create({
    data: {
      groupId,
      gateType: data.gateType ?? 'FT',
      tokenId: data.tokenId ?? '',
      minAmountBase: data.minAmountBase,
      minNftCount: data.minNftCount,
      decimals: data.decimals,
      recheckIntervalSec: data.recheckIntervalSec ?? DEFAULT_RECHECK_INTERVAL_SEC,
      gracePeriodSec: data.gracePeriodSec ?? DEFAULT_GRACE_PERIOD_SEC,
      actionOnFail: data.actionOnFail ?? 'RESTRICT',
      verifyAddress: data.verifyAddress,
      verifyMinSat: data.verifyMinSat ?? DEFAULT_VERIFY_MIN_SAT,
      verifyMaxSat: data.verifyMaxSat ?? DEFAULT_VERIFY_MAX_SAT,
      verifyExpireMin: data.verifyExpireMin ?? DEFAULT_VERIFY_EXPIRE_MIN,
    },
  });

  // Log to audit
  await prisma.auditLog.create({
    data: {
      groupId,
      tgUserId: state.userId,
      type: 'SETUP',
      payloadJson: JSON.stringify({
        gateType: data.gateType,
        tokenId: data.tokenId,
        mode: data.mode,
        setupCode,
      }),
    },
  });

  logger.info({ groupId, setupCode }, 'Group configuration saved');

  return { groupId, setupCode };
}
