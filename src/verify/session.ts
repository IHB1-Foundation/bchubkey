import { randomInt } from 'crypto';
import { prisma } from '../db/client.js';
import { createChildLogger } from '../util/logger.js';
import type { VerifySession } from '../generated/prisma/client.js';

const logger = createChildLogger('verify:session');

export interface CreateSessionParams {
  tgUserId: string;
  groupId: string;
  address: string;
  verifyAddress: string;
  minSat: number;
  maxSat: number;
  expireMinutes: number;
}

export interface CreateSessionResult {
  success: boolean;
  session?: VerifySession;
  error?: string;
}

const MAX_COLLISION_ATTEMPTS = 10;

export async function createVerifySession(
  params: CreateSessionParams
): Promise<CreateSessionResult> {
  const { tgUserId, groupId, address, verifyAddress, minSat, maxSat, expireMinutes } = params;

  logger.info({ tgUserId, groupId, minSat, maxSat }, 'Creating verify session');

  // Cancel any existing PENDING sessions for this user and group
  await prisma.verifySession.updateMany({
    where: {
      tgUserId,
      groupId,
      status: 'PENDING',
    },
    data: {
      status: 'EXPIRED',
    },
  });

  // Find a unique amount that doesn't collide with other PENDING sessions
  let amountSat: number | null = null;
  let attempts = 0;

  while (attempts < MAX_COLLISION_ATTEMPTS) {
    const candidateAmount = randomInt(minSat, maxSat + 1);

    // Check for collision
    const existing = await prisma.verifySession.findFirst({
      where: {
        groupId,
        amountSat: candidateAmount,
        status: 'PENDING',
      },
    });

    if (!existing) {
      amountSat = candidateAmount;
      break;
    }

    attempts++;
    logger.debug({ candidateAmount, attempts }, 'Collision detected, retrying');
  }

  if (amountSat === null) {
    logger.error({ groupId, attempts }, 'Failed to find unique amount after max attempts');
    return {
      success: false,
      error: 'Too many active verification sessions. Please try again in a few minutes.',
    };
  }

  // Calculate expiry
  const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);

  // Create session
  try {
    const session = await prisma.verifySession.create({
      data: {
        tgUserId,
        groupId,
        address,
        method: 'MICRO_TX',
        amountSat,
        verificationAddress: verifyAddress,
        expiresAt,
        status: 'PENDING',
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        groupId,
        tgUserId,
        type: 'VERIFY_START',
        payloadJson: JSON.stringify({
          sessionId: session.id,
          address,
          amountSat,
          expiresAt: expiresAt.toISOString(),
        }),
      },
    });

    logger.info({ sessionId: session.id, tgUserId, groupId, amountSat }, 'Verify session created');

    return {
      success: true,
      session,
    };
  } catch (error) {
    logger.error({ error, tgUserId, groupId }, 'Failed to create verify session');
    return {
      success: false,
      error: 'Failed to create verification session. Please try again.',
    };
  }
}

export async function getActiveSession(
  tgUserId: string,
  groupId: string
): Promise<VerifySession | null> {
  return prisma.verifySession.findFirst({
    where: {
      tgUserId,
      groupId,
      status: 'PENDING',
      expiresAt: {
        gt: new Date(),
      },
    },
  });
}

export async function getSessionById(sessionId: string): Promise<VerifySession | null> {
  return prisma.verifySession.findUnique({
    where: { id: sessionId },
  });
}

export async function expireSession(sessionId: string): Promise<void> {
  await prisma.verifySession.update({
    where: { id: sessionId },
    data: { status: 'EXPIRED' },
  });
}

export function formatSessionInstructions(session: VerifySession): string {
  const expiresIn = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 60000));

  return [
    `*Micro-Transaction Verification*`,
    ``,
    `To prove you control this address, send exactly:`,
    ``,
    `*${session.amountSat} satoshis*`,
    ``,
    `To this address:`,
    `\`${session.verificationAddress}\``,
    ``,
    `Your claimed address:`,
    `\`${session.address.slice(0, 30)}...\``,
    ``,
    `⏱ Session expires in *${expiresIn} minutes*`,
    ``,
    `_After sending, click "I've Sent It" to verify._`,
  ].join('\n');
}
