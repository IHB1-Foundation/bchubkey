// HTML templates for admin dashboard (read-only)

const STYLES = `
  /* CSS Custom Properties - Light Theme (default) */
  :root {
    /* Primary colors */
    --color-primary: #1a1a2e;
    --color-primary-hover: #2a2a4e;
    --color-accent: #8be9fd;
    --color-accent-hover: #6cd4e8;

    /* Background colors */
    --color-bg-page: #f5f5f5;
    --color-bg-card: #ffffff;
    --color-bg-header: #1a1a2e;
    --color-bg-table-header: #f9f9f9;
    --color-bg-table-hover: #fafafa;

    /* Text colors */
    --color-text-primary: #333333;
    --color-text-secondary: #666666;
    --color-text-muted: #999999;
    --color-text-inverse: #ffffff;

    /* Border colors */
    --color-border: #eeeeee;
    --color-border-dark: #dddddd;

    /* Semantic colors - PASS */
    --color-pass-bg: #d4edda;
    --color-pass-text: #155724;

    /* Semantic colors - FAIL */
    --color-fail-bg: #f8d7da;
    --color-fail-text: #721c24;

    /* Semantic colors - PENDING */
    --color-pending-bg: #fff3cd;
    --color-pending-text: #856404;

    /* Semantic colors - PAUSED */
    --color-paused-bg: #e2e3e5;
    --color-paused-text: #383d41;

    /* Shadows */
    --shadow-card: 0 2px 4px rgba(0,0,0,0.1);
    --shadow-card-hover: 0 4px 8px rgba(0,0,0,0.12);

    /* Spacing */
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;

    /* Border radius */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;

    /* Transitions */
    --transition-fast: 0.15s ease;
    --transition-normal: 0.25s ease;
  }

  /* Dark Theme */
  [data-theme="dark"] {
    --color-primary: #8be9fd;
    --color-primary-hover: #a0ecfd;
    --color-accent: #8be9fd;
    --color-accent-hover: #a0ecfd;

    --color-bg-page: #0d0d14;
    --color-bg-card: #1a1a2e;
    --color-bg-header: #12121c;
    --color-bg-table-header: #232340;
    --color-bg-table-hover: #2a2a4e;

    --color-text-primary: #e8e8e8;
    --color-text-secondary: #b0b0b0;
    --color-text-muted: #808080;
    --color-text-inverse: #1a1a2e;

    --color-border: #2a2a4e;
    --color-border-dark: #3a3a5e;

    --color-pass-bg: #1a3d2a;
    --color-pass-text: #6ee7a0;

    --color-fail-bg: #3d1a1a;
    --color-fail-text: #f07878;

    --color-pending-bg: #3d3a1a;
    --color-pending-text: #e0d070;

    --color-paused-bg: #2a2a3a;
    --color-paused-text: #a0a0b0;

    --shadow-card: 0 2px 8px rgba(0,0,0,0.3);
    --shadow-card-hover: 0 4px 16px rgba(0,0,0,0.4);
  }

  /* Base reset */
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--color-bg-page);
    color: var(--color-text-primary);
    line-height: 1.5;
    transition: background var(--transition-normal), color var(--transition-normal);
  }

  /* Container */
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg);
  }

  /* Header */
  header {
    background: var(--color-bg-header);
    color: var(--color-text-inverse);
    padding: var(--spacing-md) var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    box-shadow: var(--shadow-card);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--spacing-md);
  }

  .header-brand {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .header-logo {
    width: 36px;
    height: 36px;
  }

  header h1 {
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  header a {
    color: var(--color-accent);
    text-decoration: none;
    transition: color var(--transition-fast);
  }

  header a:hover {
    color: var(--color-accent-hover);
    text-decoration: underline;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
  }

  nav {
    font-size: 0.9rem;
  }

  nav a {
    margin-right: var(--spacing-md);
  }

  /* Theme toggle */
  .theme-toggle {
    background: transparent;
    border: 1px solid var(--color-accent);
    color: var(--color-accent);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    transition: all var(--transition-fast);
  }

  .theme-toggle:hover {
    background: var(--color-accent);
    color: var(--color-text-inverse);
  }

  .theme-icon {
    font-size: 1rem;
    line-height: 1;
  }

  /* Cards */
  .card {
    background: var(--color-bg-card);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    box-shadow: var(--shadow-card);
    transition: background var(--transition-normal), box-shadow var(--transition-normal);
  }

  .card h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--spacing-sm);
    color: var(--color-text-primary);
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  th, td {
    padding: var(--spacing-sm) var(--spacing-md);
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }

  th {
    background: var(--color-bg-table-header);
    font-weight: 600;
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  tr {
    transition: background var(--transition-fast);
  }

  tbody tr:hover {
    background: var(--color-bg-table-hover);
  }

  /* Badges */
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .badge-pass {
    background: var(--color-pass-bg);
    color: var(--color-pass-text);
  }

  .badge-fail {
    background: var(--color-fail-bg);
    color: var(--color-fail-text);
  }

  .badge-pending {
    background: var(--color-pending-bg);
    color: var(--color-pending-text);
  }

  .badge-active {
    background: var(--color-pass-bg);
    color: var(--color-pass-text);
  }

  .badge-paused {
    background: var(--color-paused-bg);
    color: var(--color-paused-text);
  }

  /* Stats */
  .stats {
    display: flex;
    gap: var(--spacing-md);
    flex-wrap: wrap;
    margin-bottom: var(--spacing-lg);
  }

  .stat-box {
    background: var(--color-bg-card);
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
    min-width: 130px;
    flex: 1;
    max-width: 200px;
    transition: background var(--transition-normal), box-shadow var(--transition-normal), transform var(--transition-fast);
  }

  .stat-box:hover {
    box-shadow: var(--shadow-card-hover);
    transform: translateY(-2px);
  }

  .stat-box .value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-primary);
    line-height: 1.2;
  }

  .stat-box .label {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-top: var(--spacing-xs);
  }

  /* Buttons */
  a.btn {
    display: inline-block;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-primary);
    color: var(--color-text-inverse);
    text-decoration: none;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    font-weight: 500;
    transition: background var(--transition-fast), transform var(--transition-fast);
  }

  a.btn:hover {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
    text-decoration: none;
  }

  [data-theme="dark"] a.btn {
    background: var(--color-accent);
    color: var(--color-text-inverse);
  }

  [data-theme="dark"] a.btn:hover {
    background: var(--color-accent-hover);
  }

  /* Monospace text */
  .mono {
    font-family: 'SF Mono', Monaco, 'Consolas', monospace;
    font-size: 0.85rem;
  }

  .truncate {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Log entries */
  .log-entry {
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--color-border);
    font-size: 0.9rem;
  }

  .log-entry:last-child {
    border-bottom: none;
  }

  .log-time {
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }

  .log-type {
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .empty {
    color: var(--color-text-muted);
    font-style: italic;
    padding: var(--spacing-lg);
    text-align: center;
  }

  /* Detail grid */
  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-md);
  }

  .detail-item .label {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-bottom: var(--spacing-xs);
  }

  .detail-item .value {
    font-weight: 500;
    color: var(--color-text-primary);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .container {
      padding: var(--spacing-md);
    }

    .header-content {
      flex-direction: column;
      align-items: flex-start;
    }

    .header-right {
      width: 100%;
      justify-content: space-between;
    }

    .stats {
      flex-direction: column;
    }

    .stat-box {
      max-width: none;
    }

    table {
      font-size: 0.8rem;
    }

    th, td {
      padding: var(--spacing-xs) var(--spacing-sm);
    }

    .detail-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 480px) {
    .detail-grid {
      grid-template-columns: 1fr;
    }

    .truncate {
      max-width: 120px;
    }
  }
`;

// Inline logo SVG (simplified for header)
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" class="header-logo">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#2a2a4e"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="90" fill="url(#bgGrad)"/>
  <g transform="translate(100, 100)">
    <circle cx="-20" cy="-25" r="28" fill="none" stroke="#8be9fd" stroke-width="8"/>
    <circle cx="-20" cy="-25" r="10" fill="#1a1a2e"/>
    <rect x="-4" y="-5" width="8" height="55" fill="#8be9fd" rx="2"/>
    <rect x="4" y="25" width="16" height="8" fill="#8be9fd" rx="2"/>
    <rect x="4" y="38" width="12" height="8" fill="#8be9fd" rx="2"/>
  </g>
  <g transform="translate(145, 55)">
    <path d="M0,-12 L12,0 L0,12 L-12,0 Z" fill="#8be9fd" opacity="0.8"/>
  </g>
</svg>`;

// Theme toggle JavaScript
const THEME_SCRIPT = `
<script>
(function() {
  const STORAGE_KEY = 'bchubkey-theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // localStorage not available
    }
  }

  function getPreferredTheme() {
    const stored = getStoredTheme();
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateToggleButton(theme);
  }

  function updateToggleButton(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const icon = btn.querySelector('.theme-icon');
    const text = btn.querySelector('.theme-text');
    if (theme === DARK) {
      icon.textContent = '\\u2600'; // Sun
      text.textContent = 'Light';
    } else {
      icon.textContent = '\\u263D'; // Moon
      text.textContent = 'Dark';
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || LIGHT;
    const next = current === DARK ? LIGHT : DARK;
    setStoredTheme(next);
    applyTheme(next);
  }

  // Apply theme immediately to prevent flash
  applyTheme(getPreferredTheme());

  // Set up toggle button click handler
  document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', toggleTheme);
    }
  });

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    if (!getStoredTheme()) {
      applyTheme(e.matches ? DARK : LIGHT);
    }
  });
})();
</script>
`;

function layout(title: string, content: string, breadcrumb?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - BCHubKey Admin</title>
  <style>${STYLES}</style>
</head>
<body>
  <header>
    <div class="header-content">
      <div class="header-brand">
        ${LOGO_SVG}
        <h1>BCHubKey</h1>
      </div>
      <div class="header-right">
        <nav>
          <a href="/">Groups</a>
          ${breadcrumb ?? ''}
        </nav>
        <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Toggle theme">
          <span class="theme-icon">&#9789;</span>
          <span class="theme-text">Dark</span>
        </button>
      </div>
    </div>
  </header>
  <div class="container">
    ${content}
  </div>
  ${THEME_SCRIPT}
</body>
</html>`;
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleString();
}

function stateBadge(state: string): string {
  const classes: Record<string, string> = {
    VERIFIED_PASS: 'badge-pass',
    VERIFIED_FAIL: 'badge-fail',
    PENDING_VERIFY: 'badge-pending',
    UNKNOWN: 'badge-pending',
  };
  return `<span class="badge ${classes[state] ?? ''}">${escapeHtml(state)}</span>`;
}

function statusBadge(status: string): string {
  return status === 'ACTIVE'
    ? '<span class="badge badge-active">ACTIVE</span>'
    : '<span class="badge badge-paused">PAUSED</span>';
}

export interface GroupSummary {
  id: string;
  title: string;
  mode: string;
  status: string;
  memberCount: number;
  passCount: number;
  failCount: number;
  createdAt: Date;
}

export function groupsListPage(groups: GroupSummary[]): string {
  const rows =
    groups.length === 0
      ? '<tr><td colspan="6" class="empty">No groups configured yet</td></tr>'
      : groups
          .map(
            (g) => `
      <tr>
        <td><a href="/groups/${escapeHtml(g.id)}">${escapeHtml(g.title)}</a></td>
        <td class="mono truncate">${escapeHtml(g.id)}</td>
        <td>${escapeHtml(g.mode)}</td>
        <td>${statusBadge(g.status)}</td>
        <td>${g.passCount} / ${g.failCount} / ${g.memberCount}</td>
        <td>${formatDate(g.createdAt)}</td>
      </tr>
    `
          )
          .join('');

  const content = `
    <div class="stats">
      <div class="stat-box">
        <div class="value">${groups.length}</div>
        <div class="label">Total Groups</div>
      </div>
      <div class="stat-box">
        <div class="value">${groups.reduce((sum, g) => sum + g.memberCount, 0)}</div>
        <div class="label">Total Members</div>
      </div>
      <div class="stat-box">
        <div class="value">${groups.filter((g) => g.status === 'ACTIVE').length}</div>
        <div class="label">Active Groups</div>
      </div>
    </div>
    <div class="card">
      <h2>Groups</h2>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Chat ID</th>
            <th>Mode</th>
            <th>Status</th>
            <th>Pass / Fail / Total</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
  return layout('Groups', content);
}

export interface GroupDetail {
  id: string;
  title: string;
  mode: string;
  status: string;
  setupCode: string;
  createdAt: Date;
  updatedAt: Date;
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
  lastCheckedAt: Date | null;
  enforced: string;
}

export interface AuditLogEntry {
  id: string;
  type: string;
  tgUserId: string | null;
  payloadJson: string;
  createdAt: Date;
}

export function groupDetailPage(
  group: GroupDetail,
  rule: GateRuleDetail | null,
  members: MemberDetail[],
  logs: AuditLogEntry[]
): string {
  const passCount = members.filter((m) => m.state === 'VERIFIED_PASS').length;
  const failCount = members.filter((m) => m.state === 'VERIFIED_FAIL').length;
  const pendingCount = members.filter(
    (m) => m.state === 'PENDING_VERIFY' || m.state === 'UNKNOWN'
  ).length;

  const memberRows =
    members.length === 0
      ? '<tr><td colspan="6" class="empty">No members</td></tr>'
      : members
          .map(
            (m) => `
      <tr>
        <td class="mono">${escapeHtml(m.tgUserId)}</td>
        <td>${escapeHtml(m.username) || '-'}</td>
        <td>${escapeHtml(m.firstName) || '-'}</td>
        <td>${stateBadge(m.state)}</td>
        <td class="mono">${escapeHtml(m.lastBalanceBase) || '-'}</td>
        <td>${formatDate(m.lastCheckedAt)}</td>
      </tr>
    `
          )
          .join('');

  const logRows =
    logs.length === 0
      ? '<div class="empty">No audit logs</div>'
      : logs
          .map((l) => {
            let payload = '';
            try {
              const p = JSON.parse(l.payloadJson);
              payload = JSON.stringify(p, null, 0);
              if (payload.length > 100) payload = payload.slice(0, 100) + '...';
            } catch {
              payload = l.payloadJson.slice(0, 100);
            }
            return `
          <div class="log-entry">
            <span class="log-time">${formatDate(l.createdAt)}</span>
            <span class="log-type">[${escapeHtml(l.type)}]</span>
            ${l.tgUserId ? `<span class="mono">user:${escapeHtml(l.tgUserId)}</span>` : ''}
            <span class="mono" style="color:var(--color-text-secondary)">${escapeHtml(payload)}</span>
          </div>
        `;
          })
          .join('');

  const ruleSection = rule
    ? `
    <div class="detail-grid">
      <div class="detail-item">
        <div class="label">Gate Type</div>
        <div class="value">${escapeHtml(rule.gateType)}</div>
      </div>
      <div class="detail-item">
        <div class="label">Token ID</div>
        <div class="value mono truncate">${escapeHtml(rule.tokenId)}</div>
      </div>
      <div class="detail-item">
        <div class="label">Min Amount</div>
        <div class="value">${rule.gateType === 'FT' ? escapeHtml(rule.minAmountBase) : rule.minNftCount} ${rule.gateType === 'FT' ? '(base)' : 'NFT(s)'}</div>
      </div>
      <div class="detail-item">
        <div class="label">Recheck Interval</div>
        <div class="value">${rule.recheckIntervalSec}s</div>
      </div>
      <div class="detail-item">
        <div class="label">Grace Period</div>
        <div class="value">${rule.gracePeriodSec}s</div>
      </div>
      <div class="detail-item">
        <div class="label">Action on Fail</div>
        <div class="value">${escapeHtml(rule.actionOnFail)}</div>
      </div>
      <div class="detail-item">
        <div class="label">Verify Address</div>
        <div class="value mono truncate">${escapeHtml(rule.verifyAddress) || '-'}</div>
      </div>
      <div class="detail-item">
        <div class="label">Verify Sat Range</div>
        <div class="value">${rule.verifyMinSat} - ${rule.verifyMaxSat}</div>
      </div>
    </div>
  `
    : '<div class="empty">No gate rule configured</div>';

  const content = `
    <div class="stats">
      <div class="stat-box">
        <div class="value">${members.length}</div>
        <div class="label">Total Members</div>
      </div>
      <div class="stat-box">
        <div class="value" style="color:var(--color-pass-text)">${passCount}</div>
        <div class="label">PASS</div>
      </div>
      <div class="stat-box">
        <div class="value" style="color:var(--color-fail-text)">${failCount}</div>
        <div class="label">FAIL</div>
      </div>
      <div class="stat-box">
        <div class="value" style="color:var(--color-pending-text)">${pendingCount}</div>
        <div class="label">PENDING</div>
      </div>
    </div>

    <div class="card">
      <h2>Group Info</h2>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="label">Title</div>
          <div class="value">${escapeHtml(group.title)}</div>
        </div>
        <div class="detail-item">
          <div class="label">Chat ID</div>
          <div class="value mono">${escapeHtml(group.id)}</div>
        </div>
        <div class="detail-item">
          <div class="label">Mode</div>
          <div class="value">${escapeHtml(group.mode)}</div>
        </div>
        <div class="detail-item">
          <div class="label">Status</div>
          <div class="value">${statusBadge(group.status)}</div>
        </div>
        <div class="detail-item">
          <div class="label">Setup Code</div>
          <div class="value mono">${escapeHtml(group.setupCode)}</div>
        </div>
        <div class="detail-item">
          <div class="label">Created</div>
          <div class="value">${formatDate(group.createdAt)}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Gate Rule</h2>
      ${ruleSection}
    </div>

    <div class="card">
      <h2>Members (${members.length})</h2>
      <table>
        <thead>
          <tr>
            <th>User ID</th>
            <th>Username</th>
            <th>Name</th>
            <th>State</th>
            <th>Balance</th>
            <th>Last Check</th>
          </tr>
        </thead>
        <tbody>
          ${memberRows}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Audit Logs (Latest 50)</h2>
      ${logRows}
    </div>
  `;

  return layout(
    escapeHtml(group.title),
    content,
    `<a href="/groups/${escapeHtml(group.id)}">${escapeHtml(group.title)}</a>`
  );
}

export function notFoundPage(): string {
  return layout(
    'Not Found',
    `
    <div class="card">
      <h2>404 - Not Found</h2>
      <p>The page you requested was not found.</p>
      <p><a href="/" class="btn">Back to Groups</a></p>
    </div>
  `
  );
}

export function errorPage(message: string): string {
  return layout(
    'Error',
    `
    <div class="card">
      <h2>Error</h2>
      <p>${escapeHtml(message)}</p>
      <p><a href="/" class="btn">Back to Groups</a></p>
    </div>
  `
  );
}
