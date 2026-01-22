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

  .stat-box.stat-wide {
    min-width: 180px;
    max-width: 280px;
  }

  .stat-box .sub-value {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    margin-top: var(--spacing-xs);
  }

  /* Overview row (stats + chart side by side) */
  .overview-row {
    display: flex;
    gap: var(--spacing-lg);
    flex-wrap: wrap;
    margin-bottom: var(--spacing-lg);
  }

  .overview-stats {
    flex: 1;
    min-width: 300px;
  }

  .overview-chart {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Donut chart */
  .donut-chart-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
  }

  .donut-chart {
    width: 140px;
    height: 140px;
  }

  .donut-legend {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 0.85rem;
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .legend-color.pass { background: var(--color-pass-text); }
  .legend-color.fail { background: var(--color-fail-text); }
  .legend-color.pending { background: var(--color-pending-text); }

  .legend-value {
    font-weight: 600;
    margin-left: auto;
    padding-left: var(--spacing-md);
  }

  /* Recent events panel */
  .recent-events {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
  }

  @media (max-width: 900px) {
    .recent-events {
      grid-template-columns: 1fr;
    }
  }

  .event-card {
    background: var(--color-bg-card);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    box-shadow: var(--shadow-card);
  }

  .event-card h3 {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .event-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--color-border);
    font-size: 0.85rem;
  }

  .event-item:last-child {
    border-bottom: none;
  }

  .event-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
  }

  .event-icon.pass {
    background: var(--color-pass-bg);
    color: var(--color-pass-text);
  }

  .event-icon.fail {
    background: var(--color-fail-bg);
    color: var(--color-fail-text);
  }

  .event-icon.action {
    background: var(--color-pending-bg);
    color: var(--color-pending-text);
  }

  .event-icon.verify {
    background: var(--color-paused-bg);
    color: var(--color-paused-text);
  }

  .event-content {
    flex: 1;
    min-width: 0;
  }

  .event-title {
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .event-meta {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-top: 2px;
  }

  /* Table filters and controls */
  .table-controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
    align-items: center;
  }

  .table-controls .search-input {
    flex: 1;
    min-width: 200px;
    max-width: 300px;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    background: var(--color-bg-card);
    color: var(--color-text-primary);
    transition: border-color var(--transition-fast);
  }

  .table-controls .search-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .table-controls .search-input::placeholder {
    color: var(--color-text-muted);
  }

  .table-controls select {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    background: var(--color-bg-card);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: border-color var(--transition-fast);
  }

  .table-controls select:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .table-controls label {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-right: var(--spacing-xs);
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  /* Pagination */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: var(--spacing-md);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--color-border);
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }

  .pagination-info {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }

  .pagination-buttons {
    display: flex;
    gap: var(--spacing-sm);
  }

  .pagination-buttons a,
  .pagination-buttons span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xs) var(--spacing-sm);
    min-width: 32px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    text-decoration: none;
    transition: all var(--transition-fast);
  }

  .pagination-buttons a {
    background: var(--color-bg-card);
    color: var(--color-text-primary);
    cursor: pointer;
  }

  .pagination-buttons a:hover {
    border-color: var(--color-accent);
    background: var(--color-bg-table-hover);
  }

  .pagination-buttons span.current {
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border-color: var(--color-primary);
  }

  [data-theme="dark"] .pagination-buttons span.current {
    background: var(--color-accent);
    color: var(--color-text-inverse);
    border-color: var(--color-accent);
  }

  .pagination-buttons span.disabled {
    background: var(--color-bg-table-header);
    color: var(--color-text-muted);
    cursor: not-allowed;
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

  /* Enhanced log entries */
  .log-filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
    align-items: center;
  }

  .log-filters select,
  .log-filters input {
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    background: var(--color-bg-card);
    color: var(--color-text-primary);
  }

  .log-filters input {
    width: 120px;
  }

  .log-filters label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.85rem;
    cursor: pointer;
  }

  .log-filters input[type="checkbox"] {
    width: auto;
  }

  .log-entry-enhanced {
    padding: var(--spacing-sm);
    border-bottom: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-xs);
    background: var(--color-bg-card);
    transition: background var(--transition-fast);
  }

  .log-entry-enhanced:hover {
    background: var(--color-bg-table-hover);
  }

  .log-entry-enhanced:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  .log-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
  }

  .log-expand-icon {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    transition: transform var(--transition-fast);
    width: 12px;
  }

  .log-entry-enhanced.expanded .log-expand-icon {
    transform: rotate(90deg);
  }

  .log-type-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .log-type-badge.pass { background: var(--color-pass-bg); color: var(--color-pass-text); }
  .log-type-badge.fail { background: var(--color-fail-bg); color: var(--color-fail-text); }
  .log-type-badge.action { background: var(--color-pending-bg); color: var(--color-pending-text); }
  .log-type-badge.neutral { background: var(--color-paused-bg); color: var(--color-paused-text); }

  .log-payload {
    display: none;
    margin-top: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--color-bg-page);
    border-radius: var(--radius-sm);
    position: relative;
  }

  .log-entry-enhanced.expanded .log-payload {
    display: block;
  }

  .log-payload pre {
    margin: 0;
    font-family: 'SF Mono', Monaco, 'Consolas', monospace;
    font-size: 0.8rem;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 200px;
    overflow-y: auto;
    color: var(--color-text-primary);
  }

  .log-copy-btn {
    position: absolute;
    top: var(--spacing-xs);
    right: var(--spacing-xs);
    padding: 2px 6px;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .log-copy-btn:hover {
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border-color: var(--color-primary);
  }

  .log-copy-btn.copied {
    background: var(--color-pass-bg);
    color: var(--color-pass-text);
    border-color: var(--color-pass-text);
  }

  /* Health indicators and status bar */
  .status-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-card);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
    font-size: 0.85rem;
    box-shadow: var(--shadow-card);
  }

  .status-indicators {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    flex-wrap: wrap;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .status-dot.healthy {
    background: var(--color-pass-text);
  }

  .status-dot.warning {
    background: var(--color-pending-text);
  }

  .status-dot.error {
    background: var(--color-fail-text);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .status-label {
    color: var(--color-text-secondary);
  }

  .last-updated {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }

  .auto-refresh-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .auto-refresh-toggle input {
    cursor: pointer;
  }

  .auto-refresh-toggle label {
    cursor: pointer;
    user-select: none;
  }

  .refresh-countdown {
    font-variant-numeric: tabular-nums;
    min-width: 40px;
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

// Audit log viewer JavaScript
const LOG_SCRIPT = `
<script>
(function() {
  // Log entry expand/collapse
  document.addEventListener('click', function(e) {
    const header = e.target.closest('.log-header');
    if (header) {
      const entry = header.closest('.log-entry-enhanced');
      if (entry) {
        entry.classList.toggle('expanded');
      }
    }
  });

  // Copy payload to clipboard
  document.addEventListener('click', function(e) {
    const copyBtn = e.target.closest('.log-copy-btn');
    if (copyBtn) {
      e.stopPropagation();
      const payload = copyBtn.getAttribute('data-payload');
      if (payload) {
        navigator.clipboard.writeText(payload).then(function() {
          copyBtn.textContent = 'Copied!';
          copyBtn.classList.add('copied');
          setTimeout(function() {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        }).catch(function() {
          copyBtn.textContent = 'Failed';
          setTimeout(function() {
            copyBtn.textContent = 'Copy';
          }, 2000);
        });
      }
    }
  });

  // Log filters - client-side filtering for quick response
  const logFilters = document.getElementById('log-filters');
  if (logFilters) {
    const typeFilter = logFilters.querySelector('[name="logType"]');
    const userFilter = logFilters.querySelector('[name="logUser"]');
    const failuresOnly = logFilters.querySelector('[name="failuresOnly"]');
    const logEntries = document.querySelectorAll('.log-entry-enhanced');

    const failureTypes = ['GATE_FAIL', 'VERIFY_FAIL', 'RESTRICT', 'KICK', 'ERROR'];

    function applyFilters() {
      const selectedType = typeFilter ? typeFilter.value : 'all';
      const userId = userFilter ? userFilter.value.trim() : '';
      const showFailuresOnly = failuresOnly ? failuresOnly.checked : false;

      logEntries.forEach(function(entry) {
        const entryType = entry.getAttribute('data-type');
        const entryUser = entry.getAttribute('data-user') || '';

        let show = true;

        // Type filter
        if (selectedType && selectedType !== 'all' && entryType !== selectedType) {
          show = false;
        }

        // Failures only filter
        if (showFailuresOnly && !failureTypes.includes(entryType)) {
          show = false;
        }

        // User filter
        if (userId && !entryUser.includes(userId)) {
          show = false;
        }

        entry.style.display = show ? '' : 'none';
      });
    }

    if (typeFilter) typeFilter.addEventListener('change', applyFilters);
    if (userFilter) userFilter.addEventListener('input', applyFilters);
    if (failuresOnly) failuresOnly.addEventListener('change', applyFilters);
  }
})();
</script>
`;

// Auto-refresh JavaScript
const REFRESH_SCRIPT = `
<script>
(function() {
  const REFRESH_INTERVAL = 30000; // 30 seconds
  const STORAGE_KEY = 'bchubkey-autorefresh';

  let refreshTimer = null;
  let countdown = REFRESH_INTERVAL / 1000;
  let countdownTimer = null;

  const checkbox = document.getElementById('auto-refresh-toggle');
  const countdownEl = document.getElementById('refresh-countdown');
  const lastUpdatedEl = document.getElementById('last-updated-time');

  function getAutoRefreshState() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  function setAutoRefreshState(enabled) {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    } catch (e) {}
  }

  function startAutoRefresh() {
    if (refreshTimer) return;
    countdown = REFRESH_INTERVAL / 1000;
    updateCountdown();

    countdownTimer = setInterval(function() {
      countdown--;
      updateCountdown();
    }, 1000);

    refreshTimer = setInterval(function() {
      window.location.reload();
    }, REFRESH_INTERVAL);
  }

  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (countdownEl) {
      countdownEl.textContent = '';
    }
  }

  function updateCountdown() {
    if (countdownEl) {
      countdownEl.textContent = '(' + countdown + 's)';
    }
  }

  function updateLastUpdated() {
    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = new Date().toLocaleTimeString();
    }
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', function() {
    updateLastUpdated();

    if (checkbox) {
      const enabled = getAutoRefreshState();
      checkbox.checked = enabled;

      if (enabled) {
        startAutoRefresh();
      }

      checkbox.addEventListener('change', function() {
        setAutoRefreshState(this.checked);
        if (this.checked) {
          startAutoRefresh();
        } else {
          stopAutoRefresh();
        }
      });
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
  ${LOG_SCRIPT}
  ${REFRESH_SCRIPT}
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

export interface GroupStats {
  lastRecheckAt: Date | null;
  lastEnforcementAt: Date | null;
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

// Helper: Build query string preserving current filters
function buildQueryString(
  groupId: string,
  filters: MemberFilters,
  overrides: Partial<MemberFilters>
): string {
  const params = new URLSearchParams();
  const merged = { ...filters, ...overrides };

  if (merged.search) params.set('search', merged.search);
  if (merged.state && merged.state !== 'all') params.set('state', merged.state);
  if (merged.sortBy && merged.sortBy !== 'lastCheckedAt') params.set('sortBy', merged.sortBy);
  if (merged.sortOrder && merged.sortOrder !== 'desc') params.set('sortOrder', merged.sortOrder);
  if (merged.page && merged.page !== 1) params.set('page', String(merged.page));
  if (merged.limit && merged.limit !== 20) params.set('limit', String(merged.limit));

  const qs = params.toString();
  return `/groups/${groupId}${qs ? '?' + qs : ''}`;
}

// Helper: Generate table controls (search, filter, sort)
function generateTableControls(groupId: string, filters: MemberFilters): string {
  const stateOptions = [
    { value: 'all', label: 'All States' },
    { value: 'VERIFIED_PASS', label: 'PASS' },
    { value: 'VERIFIED_FAIL', label: 'FAIL' },
    { value: 'PENDING_VERIFY', label: 'PENDING' },
  ];

  const sortOptions = [
    { value: 'lastCheckedAt', label: 'Last Check' },
    { value: 'state', label: 'State' },
    { value: 'tgUserId', label: 'User ID' },
  ];

  const stateSelect = stateOptions
    .map(
      (o) =>
        `<option value="${o.value}" ${filters.state === o.value ? 'selected' : ''}>${o.label}</option>`
    )
    .join('');

  const sortSelect = sortOptions
    .map(
      (o) =>
        `<option value="${o.value}" ${filters.sortBy === o.value ? 'selected' : ''}>${o.label}</option>`
    )
    .join('');

  const orderSelect = `
    <option value="desc" ${filters.sortOrder === 'desc' ? 'selected' : ''}>Newest</option>
    <option value="asc" ${filters.sortOrder === 'asc' ? 'selected' : ''}>Oldest</option>
  `;

  return `
    <form class="table-controls" method="get" action="/groups/${escapeHtml(groupId)}">
      <input
        type="text"
        name="search"
        class="search-input"
        placeholder="Search by user ID or username..."
        value="${escapeHtml(filters.search)}"
      />
      <div class="filter-group">
        <label for="state">State:</label>
        <select name="state" id="state" onchange="this.form.submit()">
          ${stateSelect}
        </select>
      </div>
      <div class="filter-group">
        <label for="sortBy">Sort:</label>
        <select name="sortBy" id="sortBy" onchange="this.form.submit()">
          ${sortSelect}
        </select>
        <select name="sortOrder" id="sortOrder" onchange="this.form.submit()">
          ${orderSelect}
        </select>
      </div>
      <noscript><button type="submit" class="btn">Apply</button></noscript>
    </form>
  `;
}

// Helper: Generate pagination controls
function generatePagination(groupId: string, filters: MemberFilters): string {
  const { page, limit, totalCount } = filters;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const start = Math.min((page - 1) * limit + 1, totalCount);
  const end = Math.min(page * limit, totalCount);

  const prevUrl = page > 1 ? buildQueryString(groupId, filters, { page: page - 1 }) : null;
  const nextUrl = page < totalPages ? buildQueryString(groupId, filters, { page: page + 1 }) : null;

  return `
    <div class="pagination">
      <div class="pagination-info">
        Showing ${start}–${end} of ${totalCount} members
      </div>
      <div class="pagination-buttons">
        ${prevUrl ? `<a href="${prevUrl}">&laquo; Prev</a>` : '<span class="disabled">&laquo; Prev</span>'}
        <span class="current">${page}</span>
        ${nextUrl ? `<a href="${nextUrl}">Next &raquo;</a>` : '<span class="disabled">Next &raquo;</span>'}
      </div>
    </div>
  `;
}

// Helper: Generate status bar with health indicators and auto-refresh
function generateStatusBar(stats: GroupStats | undefined): string {
  const hasRecentActivity = stats?.lastRecheckAt
    ? Date.now() - new Date(stats.lastRecheckAt).getTime() < 5 * 60 * 1000
    : false;

  const systemStatus = hasRecentActivity ? 'healthy' : 'warning';
  const systemLabel = hasRecentActivity ? 'System Active' : 'Awaiting Activity';

  return `
    <div class="status-bar">
      <div class="status-indicators">
        <div class="status-indicator">
          <span class="status-dot ${systemStatus}"></span>
          <span class="status-label">${systemLabel}</span>
        </div>
        ${
          stats?.lastRecheckAt
            ? `<div class="status-indicator">
              <span class="status-label">Last Recheck: ${formatRelativeTime(stats.lastRecheckAt)}</span>
            </div>`
            : ''
        }
      </div>
      <div class="last-updated">
        <span>Updated: <span id="last-updated-time">-</span></span>
        <span class="refresh-countdown" id="refresh-countdown"></span>
        <div class="auto-refresh-toggle">
          <input type="checkbox" id="auto-refresh-toggle" />
          <label for="auto-refresh-toggle">Auto-refresh</label>
        </div>
      </div>
    </div>
  `;
}

// Helper: Generate SVG donut chart
function generateDonutChart(
  pass: number,
  fail: number,
  pending: number
): string {
  const total = pass + fail + pending;
  if (total === 0) {
    return `
      <div class="donut-chart-container">
        <svg class="donut-chart" viewBox="0 0 42 42">
          <circle cx="21" cy="21" r="15.91549431" fill="transparent" stroke="var(--color-border)" stroke-width="4" />
          <text x="21" y="24" text-anchor="middle" font-size="6" fill="var(--color-text-muted)">No data</text>
        </svg>
      </div>
    `;
  }

  const passPercent = (pass / total) * 100;
  const failPercent = (fail / total) * 100;
  const pendingPercent = (pending / total) * 100;

  // Calculate stroke-dasharray and stroke-dashoffset for each segment
  const circumference = 100;
  const passOffset = 25; // Start at 12 o'clock
  const failOffset = passOffset - passPercent;
  const pendingOffset = failOffset - failPercent;

  return `
    <div class="donut-chart-container">
      <svg class="donut-chart" viewBox="0 0 42 42">
        <circle cx="21" cy="21" r="15.91549431" fill="transparent" stroke="var(--color-border)" stroke-width="4" />
        ${pass > 0 ? `<circle cx="21" cy="21" r="15.91549431" fill="transparent" stroke="var(--color-pass-text)" stroke-width="4" stroke-dasharray="${passPercent} ${circumference - passPercent}" stroke-dashoffset="${passOffset}" />` : ''}
        ${fail > 0 ? `<circle cx="21" cy="21" r="15.91549431" fill="transparent" stroke="var(--color-fail-text)" stroke-width="4" stroke-dasharray="${failPercent} ${circumference - failPercent}" stroke-dashoffset="${failOffset}" />` : ''}
        ${pending > 0 ? `<circle cx="21" cy="21" r="15.91549431" fill="transparent" stroke="var(--color-pending-text)" stroke-width="4" stroke-dasharray="${pendingPercent} ${circumference - pendingPercent}" stroke-dashoffset="${pendingOffset}" />` : ''}
        <text x="21" y="23" text-anchor="middle" font-size="8" font-weight="600" fill="var(--color-text-primary)">${total}</text>
        <text x="21" y="28" text-anchor="middle" font-size="3" fill="var(--color-text-muted)">TOTAL</text>
      </svg>
      <div class="donut-legend">
        <div class="legend-item">
          <span class="legend-color pass"></span>
          <span>PASS</span>
          <span class="legend-value">${pass}</span>
        </div>
        <div class="legend-item">
          <span class="legend-color fail"></span>
          <span>FAIL</span>
          <span class="legend-value">${fail}</span>
        </div>
        <div class="legend-item">
          <span class="legend-color pending"></span>
          <span>PENDING</span>
          <span class="legend-value">${pending}</span>
        </div>
      </div>
    </div>
  `;
}

// Helper: Format relative time
function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never';
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

// Helper: Generate event icon and class based on log type
function getEventStyle(type: string): { icon: string; cssClass: string } {
  const typeMap: Record<string, { icon: string; cssClass: string }> = {
    GATE_PASS: { icon: '&#10003;', cssClass: 'pass' },
    GATE_FAIL: { icon: '&#10007;', cssClass: 'fail' },
    VERIFY_SUCCESS: { icon: '&#10003;', cssClass: 'pass' },
    VERIFY_FAIL: { icon: '&#10007;', cssClass: 'fail' },
    RESTRICT: { icon: '&#9888;', cssClass: 'action' },
    UNRESTRICT: { icon: '&#10003;', cssClass: 'pass' },
    KICK: { icon: '&#10007;', cssClass: 'fail' },
    SETUP: { icon: '&#9881;', cssClass: 'verify' },
    RECHECK: { icon: '&#8635;', cssClass: 'verify' },
    ERROR: { icon: '&#9888;', cssClass: 'fail' },
  };
  return typeMap[type] || { icon: '&#8226;', cssClass: 'verify' };
}

// Helper: Generate human-readable event description
function getEventDescription(log: AuditLogEntry): string {
  const descriptions: Record<string, string> = {
    GATE_PASS: 'User passed gate check',
    GATE_FAIL: 'User failed gate check',
    VERIFY_SUCCESS: 'Ownership verified',
    VERIFY_FAIL: 'Verification failed',
    RESTRICT: 'User restricted',
    UNRESTRICT: 'User unrestricted',
    KICK: 'User removed',
    SETUP: 'Group configured',
    RECHECK: 'Recheck completed',
    ERROR: 'Error occurred',
  };
  return descriptions[log.type] || log.type;
}

// Helper: Generate recent events panel
function generateRecentEvents(logs: AuditLogEntry[]): string {
  // Categorize logs
  const enforcementTypes = ['RESTRICT', 'UNRESTRICT', 'KICK'];
  const gateTypes = ['GATE_PASS', 'GATE_FAIL', 'VERIFY_SUCCESS', 'VERIFY_FAIL'];

  const enforcementLogs = logs.filter((l) => enforcementTypes.includes(l.type)).slice(0, 5);
  const gateLogs = logs.filter((l) => gateTypes.includes(l.type)).slice(0, 5);

  const renderEvent = (log: AuditLogEntry): string => {
    const style = getEventStyle(log.type);
    const desc = getEventDescription(log);
    const userId = log.tgUserId ? `User ${log.tgUserId}` : 'System';
    return `
      <div class="event-item">
        <span class="event-icon ${style.cssClass}">${style.icon}</span>
        <div class="event-content">
          <div class="event-title">${escapeHtml(desc)}</div>
          <div class="event-meta">${escapeHtml(userId)} &middot; ${formatRelativeTime(log.createdAt)}</div>
        </div>
      </div>
    `;
  };

  const enforcementHtml =
    enforcementLogs.length === 0
      ? '<div class="empty" style="padding: var(--spacing-sm)">No enforcement actions</div>'
      : enforcementLogs.map(renderEvent).join('');

  const gateHtml =
    gateLogs.length === 0
      ? '<div class="empty" style="padding: var(--spacing-sm)">No gate events</div>'
      : gateLogs.map(renderEvent).join('');

  return `
    <div class="recent-events">
      <div class="event-card">
        <h3>Recent Enforcements</h3>
        ${enforcementHtml}
      </div>
      <div class="event-card">
        <h3>Recent Gate Checks</h3>
        ${gateHtml}
      </div>
    </div>
  `;
}

export function groupDetailPage(
  group: GroupDetail,
  rule: GateRuleDetail | null,
  members: MemberDetail[],
  logs: AuditLogEntry[],
  stats?: GroupStats,
  filters?: MemberFilters
): string {
  // Default filters if not provided
  const activeFilters: MemberFilters = filters || {
    search: '',
    state: 'all',
    sortBy: 'lastCheckedAt',
    sortOrder: 'desc',
    page: 1,
    limit: 20,
    totalCount: members.length,
  };

  const passCount = members.filter((m) => m.state === 'VERIFIED_PASS').length;
  const failCount = members.filter((m) => m.state === 'VERIFIED_FAIL').length;
  const pendingCount = members.filter(
    (m) => m.state === 'PENDING_VERIFY' || m.state === 'UNKNOWN'
  ).length;

  // Generate the donut chart
  const donutChart = generateDonutChart(passCount, failCount, pendingCount);

  // Generate recent events panel
  const recentEvents = generateRecentEvents(logs);

  // Generate table controls and pagination
  const tableControls = generateTableControls(group.id, activeFilters);
  const pagination = generatePagination(group.id, activeFilters);

  // Generate status bar
  const statusBar = generateStatusBar(stats);

  const memberRows =
    members.length === 0
      ? '<tr><td colspan="6" class="empty">No members matching filters</td></tr>'
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

  // Get unique log types for filter dropdown
  const logTypes = [...new Set(logs.map((l) => l.type))].sort();

  // Helper to get badge class for log type
  const getLogTypeBadgeClass = (type: string): string => {
    const passTypes = ['GATE_PASS', 'VERIFY_SUCCESS', 'UNRESTRICT'];
    const failTypes = ['GATE_FAIL', 'VERIFY_FAIL', 'RESTRICT', 'KICK', 'ERROR'];
    const actionTypes = ['SETUP', 'RECHECK'];
    if (passTypes.includes(type)) return 'pass';
    if (failTypes.includes(type)) return 'fail';
    if (actionTypes.includes(type)) return 'action';
    return 'neutral';
  };

  // Log filters HTML
  const logFiltersHtml = `
    <form id="log-filters" class="log-filters">
      <select name="logType">
        <option value="all">All Types</option>
        ${logTypes.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}
      </select>
      <input type="text" name="logUser" placeholder="User ID..." />
      <label>
        <input type="checkbox" name="failuresOnly" />
        Failures only
      </label>
    </form>
  `;

  const logRows =
    logs.length === 0
      ? '<div class="empty">No audit logs</div>'
      : logs
          .map((l) => {
            let prettyPayload = '';
            let rawPayload = l.payloadJson;
            try {
              const p = JSON.parse(l.payloadJson);
              prettyPayload = JSON.stringify(p, null, 2);
              rawPayload = l.payloadJson;
            } catch {
              prettyPayload = l.payloadJson;
            }
            const badgeClass = getLogTypeBadgeClass(l.type);
            return `
          <div class="log-entry-enhanced" data-type="${escapeHtml(l.type)}" data-user="${escapeHtml(l.tgUserId || '')}">
            <div class="log-header">
              <span class="log-expand-icon">&#9654;</span>
              <span class="log-type-badge ${badgeClass}">${escapeHtml(l.type)}</span>
              <span class="log-time">${formatDate(l.createdAt)}</span>
              ${l.tgUserId ? `<span class="mono">user:${escapeHtml(l.tgUserId)}</span>` : ''}
            </div>
            <div class="log-payload">
              <button type="button" class="log-copy-btn" data-payload="${escapeHtml(rawPayload)}">Copy</button>
              <pre>${escapeHtml(prettyPayload)}</pre>
            </div>
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
    ${statusBar}

    <div class="overview-row">
      <div class="overview-stats">
        <div class="stats" style="margin-bottom: 0">
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
        <div class="stats" style="margin-top: var(--spacing-md)">
          <div class="stat-box stat-wide">
            <div class="label">Last Recheck</div>
            <div class="sub-value">${stats?.lastRecheckAt ? formatRelativeTime(stats.lastRecheckAt) : 'Never'}</div>
          </div>
          <div class="stat-box stat-wide">
            <div class="label">Last Enforcement</div>
            <div class="sub-value">${stats?.lastEnforcementAt ? `${stats.lastEnforcementType || 'Action'} ${formatRelativeTime(stats.lastEnforcementAt)}` : 'None'}</div>
          </div>
        </div>
      </div>
      <div class="overview-chart">
        <div class="card" style="margin-bottom: 0">
          <h2>Member Distribution</h2>
          ${donutChart}
        </div>
      </div>
    </div>

    ${recentEvents}

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
      <h2>Members (${activeFilters.totalCount})</h2>
      ${tableControls}
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
      ${pagination}
    </div>

    <div class="card">
      <h2>Audit Logs (Latest 50)</h2>
      ${logFiltersHtml}
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
