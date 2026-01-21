import type { GateType, GroupMode, ActionOnFail } from '../../generated/prisma/client.js';

export type WizardStep =
  | 'SELECT_GROUP'
  | 'GATE_TYPE'
  | 'TOKEN_ID'
  | 'THRESHOLD'
  | 'JOIN_MODE'
  | 'RECHECK_INTERVAL'
  | 'GRACE_PERIOD'
  | 'VERIFY_ADDRESS'
  | 'VERIFY_AMOUNT_RANGE'
  | 'CONFIRM'
  | 'DONE';

export interface WizardState {
  userId: string;
  groupId: string;
  groupTitle: string;
  step: WizardStep;
  data: WizardData;
  createdAt: Date;
  updatedAt: Date;
}

export interface WizardData {
  gateType?: GateType;
  tokenId?: string;
  tokenName?: string; // from BCMR lookup
  tokenSymbol?: string;
  minAmountBase?: string; // FT threshold in base units
  minNftCount?: number; // NFT threshold
  decimals?: number;
  mode?: GroupMode;
  recheckIntervalSec?: number;
  gracePeriodSec?: number;
  actionOnFail?: ActionOnFail;
  verifyAddress?: string;
  verifyMinSat?: number;
  verifyMaxSat?: number;
  verifyExpireMin?: number;
}

// In-memory wizard state storage
// For MVP this is sufficient; can be upgraded to Redis/DB for persistence
const wizardStates = new Map<string, WizardState>();

// TTL for wizard states (30 minutes)
const WIZARD_TTL_MS = 30 * 60 * 1000;

export function getWizardState(userId: string): WizardState | undefined {
  const state = wizardStates.get(userId);
  if (!state) {
    return undefined;
  }

  // Check if expired
  if (Date.now() - state.createdAt.getTime() > WIZARD_TTL_MS) {
    wizardStates.delete(userId);
    return undefined;
  }

  return state;
}

export function createWizardState(
  userId: string,
  groupId: string,
  groupTitle: string
): WizardState {
  const state: WizardState = {
    userId,
    groupId,
    groupTitle,
    step: 'GATE_TYPE',
    data: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  wizardStates.set(userId, state);
  return state;
}

export function updateWizardState(
  userId: string,
  updates: Partial<WizardState>
): WizardState | null {
  const state = wizardStates.get(userId);
  if (!state) {
    return null;
  }

  Object.assign(state, updates, { updatedAt: new Date() });
  return state;
}

export function updateWizardData(
  userId: string,
  dataUpdates: Partial<WizardData>
): WizardState | null {
  const state = wizardStates.get(userId);
  if (!state) {
    return null;
  }

  Object.assign(state.data, dataUpdates);
  state.updatedAt = new Date();
  return state;
}

export function deleteWizardState(userId: string): boolean {
  return wizardStates.delete(userId);
}

export function clearExpiredWizardStates(): number {
  let cleared = 0;
  const now = Date.now();

  for (const [userId, state] of wizardStates) {
    if (now - state.createdAt.getTime() > WIZARD_TTL_MS) {
      wizardStates.delete(userId);
      cleared++;
    }
  }

  return cleared;
}
