# TICKET.md
# BCHubKey — Sequential Ticket Plan (Execute Top-to-Bottom)

## Rules
- Execute tickets strictly from top to bottom.
- Each ticket has: `Status: TODO | DOING | DONE | BLOCKED`
- When completing a ticket:
    1) Commit the code/doc changes (or provide patch)
    2) Verify Acceptance Criteria
    3) Update this file: mark ticket DONE
    4) Continue to the next TODO ticket

---

## Milestone M0 — Repo & Skeleton (Runnable Baseline)
### T-000: Initialize repository, tooling, and dev workflow
- Status: DONE
- Priority: P0
- Goal: Create a clean TypeScript Node project that can run locally and is ready for rapid iteration.
- Tasks:
    - Node 20 project setup
    - TypeScript strict config
    - Dev runner (tsx or ts-node)
    - ESLint + Prettier
    - dotenv config and `.env.example`
    - Logging utility (pino recommended)
    - Base folder structure per PROJECT.md
    - Minimal README: setup + run instructions
- Deliverables:
    - `package.json`, `tsconfig.json`, eslint/prettier config
    - `src/index.ts` entrypoint prints “starting…” and exits or idles
    - `src/util/logger.ts`
- Acceptance Criteria:
    - [ ] `npm run dev` starts successfully and prints a startup log
    - [ ] `npm run lint` passes (or is configured with expected rules)
    - [ ] `npm run format` works
    - [ ] `.env.example` exists and is complete enough to run

### T-001: Prisma + SQLite schema and migrations
- Status: DONE
- Priority: P0
- Goal: Implement DB schema in Prisma and run migrations locally.
- Tasks:
    - Implement models: groups, gate_rules, users, user_addresses, verify_sessions, memberships, audit_logs
    - Add required indexes
    - Create repository helpers (thin CRUD)
- Acceptance Criteria:
    - [ ] `npx prisma migrate dev` succeeds
    - [ ] Prisma client can create/read sample records in a smoke script
    - [ ] Tables reflect PROJECT.md schema

### T-002: Telegraf bot skeleton + routing + error handling
- Status: DONE
- Priority: P0
- Goal: Bot can run, handle basic commands in DM and groups, and process callback queries.
- Tasks:
    - Telegraf init (polling)
    - `/start`, `/help` basic replies
    - callback_query handler wiring
    - Global error handler with structured logs + audit_logs(ERROR)
- Acceptance Criteria:
    - [ ] Bot responds to `/start` in DM
    - [ ] Bot responds to `/help` in a group
    - [ ] Inline keyboard callback triggers handler

---

## Milestone M1 — Admin Setup Wizard (Rule storage + deep link)
### T-010: Group `/setup` → DM wizard entry
- Status: DONE
- Priority: P0
- Goal: Admin runs `/setup` in group and continues setup in DM.
- Tasks:
    - `/setup` command only in group/supergroup
    - Validate caller is admin
    - Validate bot has required admin permissions (restrict/ban at minimum)
    - Post message with “Open Setup Wizard” button
    - Button opens DM wizard context bound to that group
- Acceptance Criteria:
    - [ ] `/setup` posts a button in group
    - [ ] Clicking button starts wizard in DM
    - [ ] Missing permissions produces actionable error messages

### T-011: DM setup wizard steps (FT/NFT/TokenID/Min/Mode/Interval/Grace/Micro-tx)
- Status: DONE
- Priority: P0
- Goal: Admin can complete full configuration and persist rules in DB.
- Tasks:
    - Wizard state machine per admin user
    - Choose gate type (FT/NFT)
    - Input token category id
    - Input threshold:
        - FT: human amount + decimals -> base units
        - NFT: count
    - Choose mode: JOIN_REQUEST or RESTRICT
    - Choose recheck interval and grace period
    - Configure micro-tx:
        - verification address
        - sat range (default 2000–2999)
        - session TTL (default 10 min)
    - Generate setup_code + deep link
    - Save groups + gate_rules
- Acceptance Criteria:
    - [ ] Completing wizard creates/updates group and gate_rules records
    - [ ] Deep link includes correct groupId + setup_code
    - [ ] `/settings` shows the stored rule summary

### T-012: Optional token metadata lookup (BCMR indexer)
- Status: DONE
- Priority: P1
- Goal: Display token name/symbol/decimals during setup for better admin UX.
- Tasks:
    - Add HTTP client with timeout + retry
    - Fetch metadata by token category id
    - If lookup fails, show “lookup failed” but allow continuing
- Acceptance Criteria:
    - [ ] Token metadata is displayed when available
    - [ ] Failures do not block setup completion

---

## Milestone M2 — User Verification + Token Gate
### T-020: `/start g_<groupId>_<setupCode>` parsing and rule loading
- Status: DONE
- Priority: P0
- Goal: Deep link starts verification for a specific group and validates setup_code.
- Tasks:
    - Parse start payload reliably
    - Fetch group record; verify setup_code
    - Load gate_rules and show gate summary to user
- Acceptance Criteria:
    - [ ] Valid deep link shows group + gate info
    - [ ] Invalid setup_code is rejected immediately

### T-021: Address capture + cashaddr validation + DB upsert
- Status: DONE
- Priority: P0
- Goal: User submits BCH address; system validates and stores it.
- Tasks:
    - Parse user message as address during verification flow
    - Validate cashaddr format
    - Upsert users and user_addresses (active address)
    - Show “Proceed” button
- Acceptance Criteria:
    - [ ] Invalid address shows a clear error message
    - [ ] Valid address is stored and acknowledged

### T-022: Create verify session (unique sat) + instructions UI
- Status: DONE
- Priority: P0
- Goal: Generate micro-tx session with collision-free sat amount and show instructions.
- Tasks:
    - Random amount with collision prevention for PENDING sessions per group
    - Create verify_sessions(PENDING)
    - UI: “I sent it”, “Refresh”, “Cancel”
    - TTL: default 10 minutes
- Acceptance Criteria:
    - [ ] Session created in DB with expiry
    - [ ] Collision prevention works
    - [ ] UI buttons behave correctly

### T-023: ChainAdapter v1 (Fulcrum) — raw tx, scan incoming, token balances
- Status: DONE
- Priority: P0
- Goal: Implement minimal chain interface needed for MVP.
- Tasks:
    - Fulcrum client (WS/TCP)
    - `getRawTx(txid)` returns tx hex
    - `scanIncomingTxs(verificationAddress, sinceTs)` returns tx candidates
    - `getTokenBalanceFT(address, tokenId)` using token-aware UTXOs
    - `getTokenBalanceNFTCount(address, tokenId)` counting NFT UTXOs
    - Add TTL cache + request timeout + retries
- Acceptance Criteria:
    - [ ] A smoke script can call each method and print results
    - [ ] Failures time out and retry safely
    - [ ] Cache reduces repeated calls

### T-024: Micro-tx ownership validator (polling worker) + input ownership proof
- Status: DONE
- Priority: P0
- Goal: Detect matching tx and validate that claimed address appears in inputs (P2PKH).
- Tasks:
    - Polling loop (10–15s)
    - Find tx paying correct amount to verification address
    - Fetch raw tx and parse inputs
    - Extract pubkeys (P2PKH scriptSig) -> derive input addresses
    - SUCCESS if claimed address among inputs; else FAILED
    - Persist status + txid + audit logs
- Acceptance Criteria:
    - [ ] Success path works on a real transaction
    - [ ] Fraud attempt (output match but wrong input) fails
    - [ ] Expired sessions become EXPIRED

### T-025: Token gate check + membership state update + Telegram enforcement
- Status: DONE
- Priority: P0
- Goal: After ownership proof, apply gate rule and enforce access.
- Tasks:
    - Upsert memberships per (user, group)
    - Token balance check -> PASS/FAIL
    - Apply join mode:
        - JOIN_REQUEST: approve request if exists
        - RESTRICT: restrict until PASS; unrestrict on PASS
    - Log events in audit_logs
- Acceptance Criteria:
    - [ ] PASS user gains access (approved/unrestricted)
    - [ ] FAIL user remains restricted or pending per policy
    - [ ] Actions recorded in audit logs

---

## Milestone M3 — Periodic Recheck + Grace Enforcement
### T-030: Periodic recheck job
- Status: DONE
- Priority: P0
- Goal: Re-evaluate PASS/FAIL on schedule using per-group interval.
- Tasks:
    - Scheduler runner
    - Select memberships in VERIFIED_PASS/VERIFIED_FAIL
    - Recompute balance -> update states and timestamps
- Acceptance Criteria:
    - [ ] Rechecks run at configured interval
    - [ ] Audit logs show recheck activity

### T-031: Grace expiry enforcement job
- Status: DONE
- Priority: P0
- Goal: If FAIL persists beyond grace, enforce restrict/kick automatically.
- Tasks:
    - Manage `fail_detected_at`
    - On grace expiry, recheck and enforce if still FAIL
    - Support action_on_fail: RESTRICT or KICK
- Acceptance Criteria:
    - [ ] grace=0 enforces immediately
    - [ ] grace>0 enforces only after expiry
    - [ ] If user recovers PASS before expiry, no enforcement occurs

### T-032: Verify session timeout cleanup job
- Status: DONE
- Priority: P1
- Goal: Mark expired PENDING sessions as EXPIRED and optionally notify users.
- Acceptance Criteria:
    - [ ] Expired sessions are cleaned up automatically

---

## Milestone M4 — Admin Reporting (Demo-Grade)
### T-040: `/settings` command
- Status: DONE (implemented in T-011)
- Priority: P0
- Acceptance Criteria:
    - [ ] Prints current gate rule, mode, interval, grace, verification config

### T-041: `/members` summary
- Status: DONE
- Priority: P0
- Acceptance Criteria:
    - [ ] Shows counts PASS/FAIL/PENDING
    - [ ] Shows top N latest changes or failures

### T-042: `/audit <user>` details
- Status: DONE
- Priority: P1
- Acceptance Criteria:
    - [ ] Shows user address, last check, state history, enforcement status

### T-043: `/export` CSV
- Status: DONE
- Priority: P1
- Acceptance Criteria:
    - [ ] Exports membership data as CSV (file or text fallback)

### T-044: `/pause` `/resume` and `/banfail on|off`
- Status: DONE
- Priority: P1
- Acceptance Criteria:
    - [ ] Enforcement can be paused/resumed per group
    - [ ] FAIL enforcement action can be toggled

---

## Milestone M5 — Demo Hardening + Submission
### T-050: Demo "fast mode" presets
- Status: DONE
- Priority: P0
- Goal: Recheck=1m and grace=0–1m for live judging.
- Acceptance Criteria:
    - [ ] Demo flow reliably completes within 2–3 minutes

### T-051: Demo script + smoke tests + failure playbook
- Status: DONE
- Priority: P0
- Acceptance Criteria:
    - [ ] Step-by-step demo checklist exists
    - [ ] Common failure cases have fallback steps

### T-052: Submission packaging (README + deck outline + video guide)
- Status: DONE
- Priority: P1
- Acceptance Criteria:
    - [ ] One folder/section contains everything needed for submission

---

## Optional Milestone M6 — Read-Only Admin Dashboard
### T-060: Minimal web admin dashboard (read-only)
- Status: DONE
- Priority: P2
- Goal: Provide web pages for group overview and logs (demo enhancement).
- Acceptance Criteria:
    - [x] groups list page works
    - [x] group detail + members + logs pages work

---

## Milestone M7 — Hackathon “Fancy” Foundations (Brand + UX System)
### T-070: Brand kit (logo + colors + language)
- Status: DONE
- Priority: P1
- Goal: Establish consistent branding across Telegram + Admin Dashboard + docs.
- Tasks:
    - Define a minimal brand palette (primary/accent/neutral) and typography rules
    - Add a simple logo (SVG) + favicon (optional)
    - Standardize product language (Ownership Proof / Gate Check / Enforcement) in user/admin copy
    - Document the brand kit in `docs/` for reuse
- Acceptance Criteria:
    - [x] A single "brand kit" doc exists with palette + usage rules
    - [x] Logo asset is added and can be used in dashboard and screenshots
    - [x] Key terms are consistent across bot messages and dashboard UI

### T-071: Telegram message design system + copy pass
- Status: DONE
- Priority: P0
- Goal: Make Telegram UX feel polished and predictable with consistent formatting and tone.
- Tasks:
    - Create reusable message builders (title/section/bullets/code/warnings) for Markdown output
    - Standardize button labels (Next, Back, Refresh, Cancel, Help) across flows
    - Copy pass on `/start`, verification intro, micro-tx instructions, PASS/FAIL messages
    - Ensure messages are readable on mobile (short lines, scannable sections)
- Acceptance Criteria:
    - [x] Verification flow messages share consistent layout (title → requirements → next step)
    - [x] Buttons are consistently named and placed across steps
    - [x] Error messages include "what happened + what to do next"

### T-072: Verification flow progress UI (stepper + state clarity)
- Status: DONE
- Priority: P0
- Goal: Add "Step X/Y" cues so users always know where they are and what's next.
- Tasks:
    - Add step indicator to verification flow (Address → Micro-tx → Gate Check → Result)
    - Add explicit state labels (PENDING / EXPIRED / VERIFIED / FAILED) in status views
    - Add "Restart verification" affordance when user is stuck or expired
- Acceptance Criteria:
    - [x] User can always identify current step and the next action
    - [x] Expired/stuck flows provide a clear one-tap recovery path

### T-073: Micro-tx instruction "card" (QR + copy-friendly formatting)
- Status: DONE
- Priority: P0
- Goal: Make ownership proof instructions look premium and reduce user mistakes.
- Tasks:
    - Generate and send a QR code for the verification target (address + amount)
    - Present amount/address in copy-friendly code blocks
    - Add reminders for common pitfalls (exact sats, must send *from* claimed address, wallet caveats)
    - Provide graceful fallback when QR generation fails
- Acceptance Criteria:
    - [x] Users receive a QR image for the micro-tx step (or a clear fallback)
    - [x] Address and amount are presented in a format that's easy to copy
    - [x] "Wrong amount / wrong source address" guidance is present and concise

### T-074: Token metadata "delight" (name/symbol/icon surfaced)
- Status: DONE
- Priority: P1
- Goal: Make the gate feel real by showing token identity (not just a hex token ID).
- Tasks:
    - Show token name/symbol/decimals wherever token ID is displayed (when available)
    - If an icon URL exists, display it in Telegram (photo) and dashboard (img)
    - Ensure missing metadata remains graceful and non-blocking
- Acceptance Criteria:
    - [x] Setup wizard and verification intro show name/symbol when available
    - [x] Token icon displays when available, with a safe fallback when not
    - [x] No flow is blocked by metadata fetch failures

---

## Milestone M8 — Admin Dashboard “Fancy” UX (Demo-Ready)
### T-080: Dashboard theme refresh + dark mode toggle
- Status: DONE
- Priority: P0
- Goal: Make the admin dashboard look modern and “product-grade” for screenshots/video.
- Tasks:
    - Convert styles to CSS variables (brand palette, spacing, radii)
    - Add dark mode toggle with persistence (localStorage)
    - Improve typography + layout (header, cards, tables, responsive spacing)
- Acceptance Criteria:
    - [ ] Dark mode toggle works and persists across refresh
    - [ ] Pages remain readable and clean on common viewport sizes

### T-081: Dashboard "at-a-glance" stats + lightweight charts
- Status: DONE
- Priority: P0
- Goal: Provide an impressive overview (counts, health, trends) without heavy dependencies.
- Tasks:
    - Add summary cards: PASS/FAIL/PENDING totals, last recheck time, last enforcement action
    - Add a simple chart (inline SVG) for member states distribution
    - Add a “recent events” panel (latest audit logs distilled)
- Acceptance Criteria:
    - [ ] Group detail page includes summary cards and a simple chart
    - [ ] Recent events panel is readable and useful in demo

### T-082: Members table search/filter/sort (demo-scale, server-side)
- Status: DONE
- Priority: P1
- Goal: Make the dashboard feel usable: find users fast, filter by state, and sort.
- Tasks:
    - Add query params for filtering (state, enforced, username/userId search)
    - Add sorting (lastCheckedAt, state, balance) with stable defaults
    - Add basic pagination (page/limit) to avoid huge tables
- Acceptance Criteria:
    - [ ] Search by user ID or username works
    - [ ] Filter by state works (PASS/FAIL/PENDING)
    - [ ] Sorting and pagination produce deterministic results

### T-083: Audit logs viewer improvements (expand, filter, copy)
- Status: DONE
- Priority: P1
- Goal: Turn audit logs into a demo-friendly “trust” surface.
- Tasks:
    - Add filters (type, userId) and a quick “show only failures” view
    - Allow expanding payload JSON (pretty print) with safe truncation
    - Add “copy payload” affordance (where possible) or clearly formatted output
- Acceptance Criteria:
    - [ ] Logs can be filtered by type and by user
    - [ ] Payload expansion works and remains readable

### T-084: Live-ish updates + health indicators
- Status: DONE
- Priority: P2
- Goal: Give the dashboard a “live system” feel (helpful for demo confidence).
- Tasks:
    - Add health/status indicators (chain adapter, jobs running, verify worker heartbeat)
    - Add auto-refresh for key panels (polling or SSE)
    - Clearly show “Last updated” timestamps in UI
- Acceptance Criteria:
    - [ ] Dashboard surfaces basic system health and last update times
    - [ ] Recent events and key stats update without manual refresh

---

## Milestone M9 — Demo & Submission Polish (Showtime)
### T-090: One-command demo runner (`npm run demo`)
- Status: DONE
- Priority: P0
- Goal: Reduce demo risk by making setup deterministic and fast.
- Tasks:
    - Add `npm run demo` script that applies “fast mode” env defaults
    - Add a demo reset/seed script (DB reset optional, seeded sample group/rule optional)
    - Print a short console “demo checklist” on start (ports, mode, intervals)
- Acceptance Criteria:
    - [ ] `npm run demo` starts the app with fast intervals and clear console output
    - [ ] Optional reset/seed can be executed without manual DB poking

### T-091: Demo safety rails + visual cues
- Status: DONE
- Priority: P1
- Goal: Prevent operator mistakes during live judging.
- Tasks:
    - Add a "Demo Mode" indicator to logs and (optionally) dashboard header
    - Add guardrails for destructive actions (e.g., confirm resets in scripts)
    - Ensure all demo-critical errors log a clear remediation step
- Acceptance Criteria:
    - [x] Demo Mode is clearly visible when enabled
    - [x] Demo reset actions require explicit confirmation (or obvious opt-in)

### T-092: Submission assets (screenshots + diagram + README polish)
- Status: TODO
- Priority: P1
- Goal: Make the repo look like a complete hackathon submission.
- Tasks:
    - Add a simple architecture diagram (SVG/PNG) and embed in README
    - Capture/update key screenshots (Telegram flow + dashboard) and add to `docs/submission/`
    - Update README “Demo & Submission” section to include assets and quick links
- Acceptance Criteria:
    - [ ] README includes an architecture visual and 2–3 product screenshots
    - [ ] `docs/submission/` contains a minimal, complete asset pack for judges
