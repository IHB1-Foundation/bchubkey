// HTML templates for admin dashboard (read-only)

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; line-height: 1.5; }
  .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
  header { background: #1a1a2e; color: white; padding: 20px; margin-bottom: 20px; }
  header h1 { font-size: 1.5rem; }
  header a { color: #8be9fd; text-decoration: none; }
  header a:hover { text-decoration: underline; }
  nav { margin-top: 10px; font-size: 0.9rem; }
  nav a { margin-right: 15px; }
  .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .card h2 { font-size: 1.2rem; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #f9f9f9; font-weight: 600; }
  tr:hover { background: #fafafa; }
  .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
  .badge-pass { background: #d4edda; color: #155724; }
  .badge-fail { background: #f8d7da; color: #721c24; }
  .badge-pending { background: #fff3cd; color: #856404; }
  .badge-active { background: #d4edda; color: #155724; }
  .badge-paused { background: #e2e3e5; color: #383d41; }
  .stats { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px; }
  .stat-box { background: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); min-width: 120px; }
  .stat-box .value { font-size: 2rem; font-weight: 700; color: #1a1a2e; }
  .stat-box .label { font-size: 0.85rem; color: #666; }
  a.btn { display: inline-block; padding: 6px 12px; background: #1a1a2e; color: white; text-decoration: none; border-radius: 4px; font-size: 0.85rem; }
  a.btn:hover { background: #2a2a4e; }
  .mono { font-family: 'SF Mono', Monaco, monospace; font-size: 0.85rem; }
  .truncate { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .log-entry { padding: 8px 0; border-bottom: 1px solid #eee; }
  .log-entry:last-child { border-bottom: none; }
  .log-time { color: #666; font-size: 0.8rem; }
  .log-type { font-weight: 600; }
  .empty { color: #999; font-style: italic; padding: 20px; text-align: center; }
  .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
  .detail-item { }
  .detail-item .label { font-size: 0.8rem; color: #666; text-transform: uppercase; }
  .detail-item .value { font-weight: 500; }
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
    <h1>BCHubKey Admin Dashboard</h1>
    <nav>
      <a href="/">Groups</a>
      ${breadcrumb ?? ''}
    </nav>
  </header>
  <div class="container">
    ${content}
  </div>
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
            <span class="mono" style="color:#666">${escapeHtml(payload)}</span>
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
        <div class="value" style="color:#155724">${passCount}</div>
        <div class="label">PASS</div>
      </div>
      <div class="stat-box">
        <div class="value" style="color:#721c24">${failCount}</div>
        <div class="label">FAIL</div>
      </div>
      <div class="stat-box">
        <div class="value" style="color:#856404">${pendingCount}</div>
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
