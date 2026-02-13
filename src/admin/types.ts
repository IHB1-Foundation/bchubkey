// Shared types for admin API responses

export interface GroupSummary {
  id: string;
  title: string;
  mode: string;
  status: string;
  memberCount: number;
  passCount: number;
  failCount: number;
  createdAt: string; // ISO 8601
}

export interface GroupDetail {
  id: string;
  title: string;
  mode: string;
  status: string;
  setupCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface GateRuleDetail {
  gateType: string;
  tokenId: string;
  minAmountBase: string | null;
  minNftCount: number | null;
  decimals: number | null;
  recheckIntervalSec: number;
  gracePeriodSec: number;
  actionOnFail: string;
  verifyAddress: string | null;
  verifyMinSat: number;
  verifyMaxSat: number;
}

export interface MemberDetail {
  tgUserId: string;
  username: string | null;
  firstName: string | null;
  state: string;
  lastBalanceBase: string | null;
  lastCheckedAt: string | null;
  enforced: string;
}

export interface AuditLogEntry {
  id: string;
  type: string;
  tgUserId: string | null;
  payloadJson: string;
  createdAt: string;
}

export interface GroupStats {
  lastRecheckAt: string | null;
  lastEnforcementAt: string | null;
  lastEnforcementType: string | null;
}

export interface MemberFilters {
  search: string;
  state: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
  totalCount: number;
}

export interface GroupDetailResponse {
  group: GroupDetail;
  rule: GateRuleDetail | null;
  members: MemberDetail[];
  logs: AuditLogEntry[];
  stats: GroupStats;
  filters: MemberFilters;
}

export interface HealthResponse {
  status: 'ok';
  uptime: number;
  demoMode: boolean;
  timestamp: string;
}
