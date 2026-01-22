# PROJECT.md
# BCHubKey — CashTokens-Gated Telegram Group Automation Bot (Hackathon MVP)

## 0) Purpose of This Document
This file is the single source of truth (SSOT) for the BCHubKey project.
It defines:
- What the product is
- Why it matters
- What the MVP must and must not include
- UX flows (Telegram “screens”)
- System architecture and data model
- Core algorithms (micro-tx ownership proof, token gating, grace enforcement)
- Security/privacy principles
- Demo script and Definition of Done (DoD)

All implementation work must follow this document and `TICKET.md`.

---

## 1) One-Liner
**BCHubKey = a Telegram bot that automatically gates and manages a group based on CashTokens holdings, with ownership proof and automatic enforcement.**

User flow:
1) Start verification from a group deep link
2) Submit BCH address (cashaddr)
3) Prove address ownership (Micro-tx)
4) Token balance check (FT/NFT)
5) Auto-approve / unrestrict if PASS
6) Periodic re-check; if balance drops, grace period then auto restrict/kick

Admin flow:
- Configure everything inside Telegram (group command triggers DM wizard)
- Monitor statuses/logs from Telegram commands

---

## 2) Problem Statement
Token-gated Telegram communities are usually operated manually and are easy to bypass:
- Spam bots + low-friction join requests overwhelm admins
- “Token holder only” policies drift over time; members aren’t continuously validated
- The critical exploit: **copy/paste a whale address to pass gating** when there is no ownership proof

Result: “token gating” becomes a fiction, and communities degrade.

---

## 3) Goals and Non-Goals

### 3.1 Goals (Hackathon MVP)
1) Real automation (no human-in-the-loop for standard flow)
- Token holders: auto approve join request OR auto unrestrict to allow messaging
- Non-holders: reject/hold OR restrict (read-only), minimizing spam impact

2) Ownership proof exists (minimum viable real-world defense)
- Must prevent “paste whale address” exploit
- MVP default: **Micro-transaction (micro-tx) ownership proof**

3) Policy is durable and maintainable
- Per-group `GateRule` stored in DB
- Balance re-check scheduler + grace-period enforcement engine

4) Demo fits 2–3 minutes and is deterministic
- “Start → Verify → Approve → Send token away → Revoke” live

### 3.2 Non-Goals (Explicitly NOT in MVP)
- Twitter/X integration
- Custodial wallet / bot-held funds / tipping wallet
- Complex tiered roles (custom role titles per tier, etc.)
- Full SaaS (logins, billing, team permissions)
- Signature-based ownership proof is optional “beta” at most (micro-tx is the default)

---

## 4) Hackathon Positioning
Target track: **Applications / Utility**
- Telegram bots / onboarding / group coordination are a clean fit
- Why BCH/CashTokens:
    - Membership is an on-chain asset
    - Access control tied to token holdings becomes a real utility layer

---

## 5) Personas and Permissions

### 5.1 Roles
- **Group Owner/Admin**: sets gating policy, grants bot admin permissions, reviews logs
- **Member**: proves ownership, passes token gate, gets access
- **Bot (BCHubKey)**: enforces policy automatically, audits actions

### 5.2 Required Telegram Admin Rights for the Bot
Minimum for full MVP:
- Manage chat
- Ban users (ban/unban, kick)
- Restrict members (read-only / write-enabled)
- Invite users via link (nice-to-have but strongly recommended)
  Optional:
- Delete messages (spam control; can be omitted in MVP)

---

## 6) UX Flows (Telegram “Screens”)

### 6.1 Admin Setup (Goal: gate enabled within 3 minutes)
1) Admin adds bot to the group and makes it admin
2) Admin runs `/setup` in the group
3) Bot replies in group with a button to continue in DM
4) DM Wizard:
    - Select group
    - Choose gate type: FT or NFT
    - Enter Token Category ID
    - Enter minimum threshold (FT amount or NFT count)
    - Choose join handling mode:
        - Join Request Approve (recommended)
        - Restrict Mode (join allowed, but read-only until verified)
    - Set re-check interval and grace period
    - Configure ownership verification (Micro-tx):
        - Verification address
        - Amount range (default: 2000–2999 sats)
    - Finish: generate group deep link to start verification

Output:
- Deep link like: `https://t.me/<BotName>?start=g_<groupId>_<setupCode>`
- Admin pins it in the group.

---

### 6.2 User Verification (Goal: 1–2 minutes to access)
Entry point:
- User clicks pinned “Start Verification” deep link

Flow:
1) Bot DM explains requirements and asks for BCH address (cashaddr)
2) User sends address
3) Bot creates verification session (unique sat amount)
4) Bot instructs user to send exactly that amount to verification address within time limit
5) Bot detects tx, validates ownership via tx inputs
6) Bot checks token gate:
    - PASS → approve join request or unrestrict
    - FAIL → tell user to acquire tokens; keep restricted or pending

---

## 7) Command Specs

### 7.1 User Commands
- `/status` — show verification status, balances, per-group access state
- `/link` — change address (requires re-verification)
- `/verify` — restart ownership verification
- `/recheck` — immediate token balance re-check
- `/help` — instructions
- `/privacy` — what data is stored and why

### 7.2 Admin Commands
- `/settings` — show current gate settings summary
- `/gate set <tokenId> <min>` — quick update gate token and minimum
- `/gate mode <join|restrict>`
- `/gate grace <minutes>`
- `/gate interval <minutes>`
- `/members` — PASS/FAIL/PENDING summary (top N)
- `/audit <@user or tg_id>` — user details and history
- `/export` — CSV export (userId, address, status, last check, balance)
- `/pause` / `/resume` — pause/resume enforcement for this group
- `/banfail on|off` — choose restrict-only vs kick on FAIL after grace

---

## 8) System Architecture

### 8.1 High-Level Components
- **Bot Server**: Node.js + TypeScript
- **Telegram framework**: Telegraf
- **DB**: MySQL via Prisma (Railway)
- **Scheduler**: node-cron + DB queries (simple, robust)
- **Chain Adapter**:
    - Token balance: FT/NFT
    - Raw transaction retrieval for micro-tx ownership validation
    - Scan incoming transactions to the verification address
- Optional **Admin Dashboard** (read-only):
    - groups list, group detail, members, logs

### 8.2 Folder/Module Layout
- `src/index.ts` — entrypoint
- `src/bot/` — Telegraf setup, routing, commands, callback handlers
- `src/domain/` — entities, state machines, policy logic
- `src/db/` — Prisma client + repositories
- `src/chain/` — ChainAdapter interface + Fulcrum implementation
- `src/verify/` — verification session engine (micro-tx)
- `src/gate/` — token gate evaluation + Telegram enforcement actions
- `src/jobs/` — periodic recheck, grace expiry enforcement, session timeouts
- `src/admin/` — optional web read-only dashboard
- `src/util/` — logging, validation, formatting, rate limiting

### 8.3 Core Design Principles
- Separate “policy decision” from “Telegram enforcement”
- Never require user private keys (non-custodial)
- Strong audit logging for trust and debuggability
- Favor simplicity and demo reliability over fancy optimizations

---

## 9) Data Model (DB Schema)
Implement via Prisma (MySQL).

### 9.1 `groups`
- `id` (Telegram chat_id, bigint)
- `title`
- `type` (supergroup/channel)
- `setup_code` (string; prevents deep link forgery)
- `mode` (JOIN_REQUEST | RESTRICT)
- `status` (ACTIVE | PAUSED)
- `created_at`, `updated_at`

### 9.2 `gate_rules`
- `id` (uuid)
- `group_id` (FK groups.id)
- `gate_type` (FT | NFT)
- `token_id` (string)
- `min_amount_base` (string bigint) // FT only
- `min_nft_count` (int) // NFT only
- `decimals` (int, optional) // for display/base conversion
- `recheck_interval_sec` (int)
- `grace_period_sec` (int)
- `action_on_fail` (RESTRICT | KICK)
- `created_at`, `updated_at`

### 9.3 `users`
- `tg_user_id` (bigint PK)
- `username` (nullable)
- `first_name`, `last_name` (nullable)
- `created_at`, `updated_at`

### 9.4 `user_addresses`
- `id` (uuid)
- `tg_user_id` (FK users.tg_user_id)
- `address` (string)
- `address_type` (P2PKH|P2SH|UNKNOWN)
- `verified` (bool)
- `verified_at` (timestamp nullable)
- `active` (bool) // allows future multi-address support
- `created_at`

### 9.5 `verify_sessions`
- `id` (uuid)
- `tg_user_id`
- `group_id`
- `address` (claimed address)
- `method` (MICRO_TX | SIGNATURE)
- `amount_sat` (int) // micro-tx only
- `verification_address` (string)
- `expires_at` (timestamp)
- `status` (PENDING|SUCCESS|FAILED|EXPIRED)
- `txid` (string nullable)
- `created_at`, `updated_at`

### 9.6 `memberships`
- `id` (uuid)
- `tg_user_id`
- `group_id`
- `state` (UNKNOWN|PENDING_VERIFY|VERIFIED_FAIL|VERIFIED_PASS)
- `last_balance_base` (string bigint nullable)
- `last_checked_at` (timestamp nullable)
- `fail_detected_at` (timestamp nullable) // grace timer anchor
- `enforced` (NONE|RESTRICTED|KICKED)
- `updated_at`

### 9.7 `audit_logs`
- `id` (uuid)
- `group_id`
- `tg_user_id` (nullable)
- `type` (SETUP, VERIFY_SUCCESS, GATE_PASS, GATE_FAIL, RESTRICT, UNRESTRICT, KICK, ERROR, ...)
- `payload_json` (text)
- `created_at`

### 9.8 Required Indexes
- `memberships(group_id, state)`
- `verify_sessions(status, expires_at)`
- `audit_logs(group_id, created_at)`

---

## 10) Core Algorithms

### 10.1 Deep Link Forgery Prevention
- Each group gets a random `setup_code`
- `/start g_<groupId>_<setupCode>` must match DB
- Mismatch → stop immediately and do not reveal any details

### 10.2 Ownership Proof via Micro-Transaction (Micro-tx)
Goal:
- Prove the user controls the claimed address, not just knows it.

Session creation:
- `amountSat = randomInt(minSat, maxSat)`
- Avoid collisions: if `(groupId, amountSat)` already exists among PENDING sessions, redraw
- `expiresAt = now + 10 minutes`
- status = PENDING

Detection:
- Poll every 10–15 seconds:
    - Scan transactions paying to `verification_address`
    - Look for output where `value == amountSat`
- When found txid:
    - Retrieve raw tx hex
    - Parse inputs and extract pubkeys for standard P2PKH
    - Compute cashaddr from input pubkey(s)
    - SUCCESS iff `claimedAddress` appears among input addresses

Notes / Constraints:
- P2SH/multisig/advanced scripts may not expose pubkeys in a simple way
- MVP strategy:
    - Recommend standard P2PKH addresses
    - If validation fails, show actionable message: “Try a different address / wallet”
    - Do not accept “output-only match” without input ownership proof (prevents fake proofs)

### 10.3 Token Gate Evaluation (FT / NFT)
Interface (concept):
- `getTokenBalanceFT(address, tokenId) -> bigint (base units)`
- `getTokenBalanceNFTCount(address, tokenId) -> number`
- Apply rule:
    - FT PASS if `balanceBase >= minAmountBase`
    - NFT PASS if `count >= minNftCount`
      Caching:
- Cache (address, tokenId, gateType) results for 30–120s TTL

### 10.4 Enforcement State Machine
States:
- `PENDING_VERIFY`
- `VERIFIED_FAIL`
- `VERIFIED_PASS`

Transitions:
- On PASS:
    - If group uses Join Request: approve if request exists
    - If user already in group: unrestrict (allow sending messages)
    - Clear `fail_detected_at`
- On FAIL:
    - Set `fail_detected_at` if empty
    - If grace == 0: enforce immediately
    - Else: warn optionally, enforce only after grace expiry

Enforcement actions:
- Restrict: `restrictChatMember(can_send_messages=false, ...)`
- Unrestrict: set default permissions
- Kick: `banChatMember` then optionally `unbanChatMember` for rejoin eligibility

### 10.5 Scheduler Jobs
Job 1) Periodic Recheck
- Frequency: per-group `recheck_interval_sec`
- Targets: memberships in VERIFIED_PASS or VERIFIED_FAIL
- Action: token check -> update PASS/FAIL, manage fail_detected_at

Job 2) Grace Expiry Enforcement
- Targets: fail_detected_at != null and grace exceeded
- Action: re-check token -> still FAIL -> restrict/kick

Job 3) Verify Session Timeout
- Targets: PENDING sessions expired
- Action: mark EXPIRED; inform user if needed

Job 4) Join Request Handling (Optional)
- If join request update event arrives:
    - Don’t DM unsolicited (Telegram limitations)
    - The deep link DM flow is primary; join request handler is secondary

---

## 11) Chain Integration Strategy (MVP)
Primary objective: maximize demo reliability by minimizing dependencies.

Recommended:
- **Fulcrum / Electrum Cash Protocol** for:
    - Raw tx retrieval (micro-tx validation)
    - Address history / mempool scanning (incoming tx detection)
    - UTXO listing with token metadata (FT/NFT balance aggregation)
- Optional:
    - **BCMR metadata API** (e.g., Paytaca indexer) for token name/symbol/decimals display in wizard

Key constraint:
- External calls must have timeouts + retries + safe fallbacks.

---

## 12) Configuration (Environment Variables)
Required:
- `TELEGRAM_BOT_TOKEN`
- `DATABASE_URL` (mysql, e.g. `mysql://bchubkey:bchubkey@localhost:3306/bchubkey`)
- `BOT_PUBLIC_NAME` or derived bot username for deep link generation

Verification defaults:
- `DEFAULT_VERIFY_MIN_SAT=2000`
- `DEFAULT_VERIFY_MAX_SAT=2999`
- `DEFAULT_VERIFY_EXPIRE_MIN=10`

Chain:
- `CHAIN_PROVIDER=FULCRUM`
- `FULCRUM_URL=...` (wss/tcp; choose one supported by implementation)

Metadata (optional):
- `TOKEN_METADATA_PROVIDER=PAYTACA_BCMR` (or NONE)
- `PAYTACA_BCMR_BASE_URL=...`

Ops:
- `LOG_LEVEL=info`
- `POLL_INTERVAL_SEC=15`

---

## 13) Security and Privacy
Store (minimal):
- Telegram user id + username (if present)
- Verified address (active)
- Membership status per group (PASS/FAIL + timestamps)
- Verification sessions (amount + txid + expiry)
- Audit logs

Never store:
- Seeds/private keys
- Full user transaction history beyond what is necessary to validate verification
- Any private key for the verification address (non-custodial by design)

Defensive measures:
- Deep link setup_code verification
- Micro-tx input ownership validation (not output-only)
- Rate limiting for session creation
- Strict admin-only commands enforcement
- Audit logging for every critical action and error

---

## 14) Demo Plan (2–3 minutes)
Pre-setup:
- Demo group in Join Request mode
- One FT token prepared (e.g., BuilderBadge)
- A demo user wallet holding enough tokens

Live demo:
1) Admin runs `/settings` to show gate config
2) Judge clicks pinned deep link
3) Judge submits address in DM
4) Judge sends exact micro-tx amount
5) Bot confirms ownership + token PASS
6) Bot approves join request OR unrestricts user
7) Judge transfers token away to fail
8) After short interval/grace, bot restricts/kicks automatically
9) Admin shows `/members` and `/audit` logs proving automation

---

## 15) Definition of Done (MVP)
MVP is DONE when all are true:
- Admin can configure gate fully in Telegram (wizard)
- User can verify via deep link and obtain access if holding tokens
- System re-checks and enforces automatically with grace period
- Core admin commands work: `/settings`, `/members`, `/audit`, `/export` (min viable)
- Audit logs exist and are useful for debugging and demo
- Demo script can be executed end-to-end reliably

---

## 16) Post-MVP Extensions (Not required now)
- Tiered access levels / multiple token rules per group
- NFT pass gating using commitments/capabilities
- Real-time event streaming to reduce polling
- Multi-group dashboard with team permissions and billing
- Signature-based ownership proof (wallet compatibility dependent)
