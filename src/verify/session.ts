import { randomInt } from 'crypto';
import { prisma } from '../db/client.js';
import { createChildLogger } from '../util/logger.js';
import { generateQRCodeBuffer, generatePaymentURI } from '../util/qr.js';
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

export interface SessionInstructionsResult {
  text: string;
  qrBuffer: Buffer | null;
  paymentUri: string;
}

export async function formatSessionInstructionsWithQR(
  session: VerifySession
): Promise<SessionInstructionsResult> {
  const expiresIn = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 60000));
  const truncatedAddress =
    session.address.length > 34 ? `${session.address.slice(0, 30)}...` : session.address;

  // Generate payment URI and QR code
  const paymentUri = generatePaymentURI(session.verificationAddress, session.amountSat);
  const qrBuffer = await generateQRCodeBuffer(paymentUri);

  const qrNote = qrBuffer
    ? '_Scan the QR code above or copy the address below._'
    : '_Copy the address and amount below._';

  const text = [
    `*Step 2 of 3: Ownership Proof*`,
    ``,
    qrNote,
    ``,
    `*Amount:* \`${session.amountSat}\` satoshis`,
    ``,
    `*Send to:*`,
    `\`${session.verificationAddress}\``,
    ``,
    `*From your address:*`,
    `\`${truncatedAddress}\``,
    ``,
    `*Time remaining:* ${expiresIn} min`,
    ``,
    `*Common mistakes to avoid:*`,
    `• Wrong amount: must be exactly ${session.amountSat} sats`,
    `• Wrong source: must send *from* your claimed address`,
    `• Use Electron Cash or standard P2PKH wallet`,
    ``,
    `_Click "I've Sent It" after sending._`,
  ].join('\n');

  return { text, qrBuffer, paymentUri };
}

export function formatSessionInstructions(session: VerifySession): string {
  const expiresIn = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 60000));
  const truncatedAddress =
    session.address.length > 34 ? `${session.address.slice(0, 30)}...` : session.address;

  return [
    `*Step 2 of 3: Ownership Proof*`,
    ``,
    `Send exactly *${session.amountSat} satoshis* to prove ownership.`,
    ``,
    `*Amount:* \`${session.amountSat}\` satoshis`,
    ``,
    `*Send to:*`,
    `\`${session.verificationAddress}\``,
    ``,
    `*From your address:*`,
    `\`${truncatedAddress}\``,
    ``,
    `*Time remaining:* ${expiresIn} min`,
    ``,
    `*Common mistakes to avoid:*`,
    `• Wrong amount: must be exactly ${session.amountSat} sats`,
    `• Wrong source: must send *from* your claimed address`,
    `• Use Electron Cash or standard P2PKH wallet`,
    ``,
    `_Click "I've Sent It" after sending._`,
  ].join('\n');
}
