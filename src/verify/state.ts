import type { GateType } from '../generated/prisma/client.js';

export type VerifyFlowStep =
  | 'AWAITING_ADDRESS'
  | 'AWAITING_TX'
  | 'CHECKING'
  | 'COMPLETE'
  | 'FAILED';

export interface VerifyFlowState {
  tgUserId: string;
  groupId: string;
  groupTitle: string;
  step: VerifyFlowStep;
  gateType: GateType;
  tokenId: string;
  threshold: string; // Display-friendly threshold
  verifyAddress: string;
  address?: string; // User's claimed BCH address
  sessionId?: string; // verify_sessions.id once created
  createdAt: Date;
  updatedAt: Date;
}

// In-memory verification flow state storage
const verifyFlowStates = new Map<string, VerifyFlowState>();

// TTL for flow states (30 minutes)
const FLOW_TTL_MS = 30 * 60 * 1000;

export function getVerifyFlowState(tgUserId: string): VerifyFlowState | undefined {
  const state = verifyFlowStates.get(tgUserId);
  if (!state) {
    return undefined;
  }

  // Check if expired
  if (Date.now() - state.createdAt.getTime() > FLOW_TTL_MS) {
    verifyFlowStates.delete(tgUserId);
    return undefined;
  }

  return state;
}

export function createVerifyFlowState(
  tgUserId: string,
  groupId: string,
  groupTitle: string,
  gateType: GateType,
  tokenId: string,
  threshold: string,
  verifyAddress: string
): VerifyFlowState {
  const state: VerifyFlowState = {
    tgUserId,
    groupId,
    groupTitle,
    step: 'AWAITING_ADDRESS',
    gateType,
    tokenId,
    threshold,
    verifyAddress,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  verifyFlowStates.set(tgUserId, state);
  return state;
}

export function updateVerifyFlowState(
  tgUserId: string,
  updates: Partial<VerifyFlowState>
): VerifyFlowState | null {
  const state = verifyFlowStates.get(tgUserId);
  if (!state) {
    return null;
  }

  Object.assign(state, updates, { updatedAt: new Date() });
  return state;
}

export function deleteVerifyFlowState(tgUserId: string): boolean {
  return verifyFlowStates.delete(tgUserId);
}

export function clearExpiredVerifyFlowStates(): number {
  let cleared = 0;
  const now = Date.now();

  for (const [tgUserId, state] of verifyFlowStates) {
    if (now - state.createdAt.getTime() > FLOW_TTL_MS) {
      verifyFlowStates.delete(tgUserId);
      cleared++;
    }
  }

  return cleared;
}
