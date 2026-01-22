/**
 * Micro-tx Ownership Verification Worker
 *
 * Polls pending verify sessions and validates ownership proof
 * by checking that the claimed address appears in tx inputs.
 */

import { prisma } from '../db/client.js';
import { getChainAdapter } from '../chain/index.js';
import { createChildLogger, logDemoError } from '../util/logger.js';
import { processGateCheck } from '../gate/index.js';
import type { VerifySession } from '../generated/prisma/client.js';

const logger = createChildLogger('verify:worker');

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_SEC ?? '15', 10) * 1000;

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

export interface VerificationResult {
  sessionId: string;
  success: boolean;
  txid?: string;
  error?: string;
  inputAddresses?: string[];
}

/**
 * Start the verification polling worker
 */
export function startVerifyWorker(): void {
  if (pollingInterval) {
    logger.warn('Verify worker already running');
    return;
  }

  logger.info({ intervalMs: POLL_INTERVAL_MS }, 'Starting verify worker');

  // Run immediately, then on interval
  runVerificationCycle().catch((error) => {
    logDemoError(
      logger,
      error,
      'Initial verification cycle failed',
      'Check chain adapter connection. Try: 1) Verify FULCRUM_URL in .env, 2) Restart the app'
    );
  });

  pollingInterval = setInterval(async () => {
    if (isRunning) {
      logger.debug('Previous verification cycle still running, skipping');
      return;
    }

    try {
      await runVerificationCycle();
    } catch (error) {
      logDemoError(
        logger,
        error,
        'Verification cycle failed',
        'Check chain connection. Try: 1) Verify FULCRUM_URL, 2) Check network connectivity, 3) Restart the app'
      );
    }
  }, POLL_INTERVAL_MS);
}

/**
 * Stop the verification polling worker
 */
export function stopVerifyWorker(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    logger.info('Verify worker stopped');
  }
}

/**
 * Run a single verification cycle
 */
async function runVerificationCycle(): Promise<void> {
  isRunning = true;

  try {
    // Get all pending sessions that haven't expired
    const pendingSessions = await prisma.verifySession.findMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (pendingSessions.length === 0) {
      logger.debug('No pending sessions to verify');
      return;
    }

    logger.info({ count: pendingSessions.length }, 'Processing pending sessions');

    // Group sessions by verification address to minimize chain queries
    const sessionsByAddress = new Map<string, VerifySession[]>();
    for (const session of pendingSessions) {
      const existing = sessionsByAddress.get(session.verificationAddress) ?? [];
      existing.push(session);
      sessionsByAddress.set(session.verificationAddress, existing);
    }

    // Process each verification address
    for (const [verifyAddress, sessions] of sessionsByAddress) {
      try {
        await processAddressSessions(verifyAddress, sessions);
      } catch (error) {
        logDemoError(
          logger,
          error,
          `Failed to process address sessions for ${verifyAddress}`,
          'Chain adapter may be offline. Try: 1) Check FULCRUM_URL, 2) Verify the address is valid BCH, 3) Restart'
        );
      }
    }

    // Handle expired sessions
    await expireOldSessions();
  } finally {
    isRunning = false;
  }
}

/**
 * Process all sessions for a specific verification address
 */
async function processAddressSessions(
  verifyAddress: string,
  sessions: VerifySession[]
): Promise<void> {
  const chain = getChainAdapter();

  // Get all incoming transactions to the verification address
  const txids = await chain.scanIncomingTxs(verifyAddress);

  if (txids.length === 0) {
    logger.debug({ verifyAddress }, 'No transactions found for verification address');
    return;
  }

  // Build a map of amount -> sessions for quick lookup
  const sessionsByAmount = new Map<number, VerifySession[]>();
  for (const session of sessions) {
    const existing = sessionsByAmount.get(session.amountSat) ?? [];
    existing.push(session);
    sessionsByAmount.set(session.amountSat, existing);
  }

  // Check each transaction
  for (const txid of txids) {
    try {
      const tx = await chain.getTx(txid);

      // Check each output for matching amounts
      for (const output of tx.outputs) {
        const matchingSessions = sessionsByAmount.get(output.value);
        if (!matchingSessions || matchingSessions.length === 0) {
          continue;
        }

        // Verify output pays to the verification address
        if (output.address !== verifyAddress) {
          continue;
        }

        logger.info(
          { txid, amount: output.value, sessionCount: matchingSessions.length },
          'Found matching transaction'
        );

        // Extract input addresses from the transaction
        const inputAddresses = tx.inputs
          .map((input) => input.address)
          .filter((addr): addr is string => addr !== undefined);

        // Process each matching session
        for (const session of matchingSessions) {
          await verifySessionOwnership(session, txid, inputAddresses);
        }

        // Remove processed sessions from lookup
        sessionsByAmount.delete(output.value);
      }
    } catch (error) {
      logger.error({ error, txid }, 'Failed to process transaction');
    }
  }
}

/**
 * Verify that the claimed address appears in the transaction inputs
 */
async function verifySessionOwnership(
  session: VerifySession,
  txid: string,
  inputAddresses: string[]
): Promise<VerificationResult> {
  const normalizedClaimed = normalizeAddress(session.address);
  const normalizedInputs = inputAddresses.map(normalizeAddress);

  logger.debug(
    {
      sessionId: session.id,
      claimed: normalizedClaimed,
      inputs: normalizedInputs,
    },
    'Checking ownership'
  );

  // Check if claimed address is in inputs
  const isOwner = normalizedInputs.some((addr) => addr === normalizedClaimed);

  if (isOwner) {
    // SUCCESS - ownership verified
    await prisma.verifySession.update({
      where: { id: session.id },
      data: {
        status: 'SUCCESS',
        txid,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        groupId: session.groupId,
        tgUserId: session.tgUserId,
        type: 'VERIFY_SUCCESS',
        payloadJson: JSON.stringify({
          sessionId: session.id,
          txid,
          claimedAddress: session.address,
          inputAddresses,
        }),
      },
    });

    // Mark user address as verified
    await prisma.userAddress.updateMany({
      where: {
        tgUserId: session.tgUserId,
        address: session.address,
        active: true,
      },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });

    logger.info(
      {
        sessionId: session.id,
        tgUserId: session.tgUserId,
        txid,
      },
      'Ownership verification SUCCESS'
    );

    // Trigger gate check after successful ownership verification
    try {
      await processGateCheck(session.tgUserId, session.groupId);
    } catch (error) {
      logger.error({ error, sessionId: session.id }, 'Gate check failed after verification');
    }

    return {
      sessionId: session.id,
      success: true,
      txid,
      inputAddresses,
    };
  } else {
    // FAILED - claimed address not in inputs (potential fraud attempt)
    await prisma.verifySession.update({
      where: { id: session.id },
      data: {
        status: 'FAILED',
        txid,
      },
    });

    // Create audit log for failed attempt
    await prisma.auditLog.create({
      data: {
        groupId: session.groupId,
        tgUserId: session.tgUserId,
        type: 'VERIFY_FAILED',
        payloadJson: JSON.stringify({
          sessionId: session.id,
          txid,
          claimedAddress: session.address,
          inputAddresses,
          reason: 'Claimed address not found in transaction inputs',
        }),
      },
    });

    logger.warn(
      {
        sessionId: session.id,
        tgUserId: session.tgUserId,
        txid,
        claimed: session.address,
        inputs: inputAddresses,
      },
      'Ownership verification FAILED - address mismatch'
    );

    return {
      sessionId: session.id,
      success: false,
      txid,
      inputAddresses,
      error: 'Claimed address not found in transaction inputs',
    };
  }
}

/**
 * Mark expired sessions as EXPIRED
 */
async function expireOldSessions(): Promise<number> {
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
    logger.info({ count: result.count }, 'Expired old sessions');
  }

  return result.count;
}

/**
 * Normalize address for comparison
 * Ensures consistent format for matching
 */
function normalizeAddress(address: string): string {
  // Lowercase and ensure prefix
  let normalized = address.toLowerCase();

  // Add bitcoincash: prefix if missing
  if (!normalized.includes(':')) {
    normalized = `bitcoincash:${normalized}`;
  }

  return normalized;
}

/**
 * Manually trigger verification for a specific session (for testing)
 */
export async function verifySession(sessionId: string): Promise<VerificationResult | null> {
  const session = await prisma.verifySession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.status !== 'PENDING') {
    return null;
  }

  const chain = getChainAdapter();
  const txids = await chain.scanIncomingTxs(session.verificationAddress);

  for (const txid of txids) {
    const tx = await chain.getTx(txid);

    for (const output of tx.outputs) {
      if (output.value === session.amountSat && output.address === session.verificationAddress) {
        const inputAddresses = tx.inputs
          .map((input) => input.address)
          .filter((addr): addr is string => addr !== undefined);

        return verifySessionOwnership(session, txid, inputAddresses);
      }
    }
  }

  return null;
}
