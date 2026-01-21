import { randomBytes } from 'crypto';
import { prisma } from '../../db/client.js';
import { createChildLogger } from '../../util/logger.js';
import type { WizardState } from './state.js';

const logger = createChildLogger('bot:wizard:save');

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
      recheckIntervalSec: data.recheckIntervalSec ?? 300,
      gracePeriodSec: data.gracePeriodSec ?? 300,
      actionOnFail: data.actionOnFail ?? 'RESTRICT',
      verifyAddress: data.verifyAddress,
      verifyMinSat: data.verifyMinSat ?? 2000,
      verifyMaxSat: data.verifyMaxSat ?? 2999,
      verifyExpireMin: data.verifyExpireMin ?? 10,
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
