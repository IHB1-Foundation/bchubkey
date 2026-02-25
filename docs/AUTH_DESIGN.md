# Admin Authentication & Authorization — Design Document

> **Status**: Approved architecture lock for M11 implementation (T-110 through T-119)
> **Date**: 2026-02-14

---

## 1. Auth Strategy: Telegram Login (Primary)

### Why Telegram Login
- Every BCHubKey admin already has a Telegram account (bot runs in Telegram)
- Telegram Login Widget provides cryptographic proof of identity (HMAC-SHA256 signed by bot token)
- Zero additional signup friction — admins authenticate with the same identity they use in-bot
- Future extension: OAuth providers (Google, GitHub) can be added later via `AdminUser.authProvider` field

### Flow
1. Vercel FE renders [Telegram Login Widget](https://core.telegram.org/widgets/login)
2. Widget redirects to FE callback with signed user data (`id`, `first_name`, `username`, `auth_date`, `hash`)
3. FE sends signed payload to `POST /api/auth/telegram` on Railway API
4. Backend validates HMAC-SHA256 signature using `TELEGRAM_BOT_TOKEN`
5. Backend upserts `AdminUser` and creates `AdminSession`
6. Backend returns JWT in response body (FE stores in `localStorage`)
7. FE includes JWT in `Authorization: Bearer <token>` header on all subsequent API calls

### Telegram Login Validation Algorithm
```
data_check_string = sorted key=value pairs (excluding hash), joined with \n
secret_key = SHA256(TELEGRAM_BOT_TOKEN)
expected_hash = HMAC-SHA256(secret_key, data_check_string)
VALID iff expected_hash === provided hash AND auth_date is within 5 minutes
```

---

## 2. Session Model: Stateless JWT + Server-Side Session Record

### JWT Token
- **Algorithm**: HS256
- **Secret**: Derived from `ADMIN_JWT_SECRET` env var (required when auth is enforced)
- **Payload**:
  ```json
  {
    "sub": "<admin_user_id (uuid)>",
    "tgId": "<telegram_user_id>",
    "sid": "<session_id (uuid)>",
    "iat": 1700000000,
    "exp": 1700086400
  }
  ```
- **Expiry**: 24 hours (configurable via `ADMIN_SESSION_TTL_SEC`, default `86400`)
- **Refresh**: Client calls `POST /api/auth/refresh` before expiry; server issues new JWT and rotates session ID

### Server-Side Session (`AdminSession` model)
- Enables revocation (logout, admin removal, security incident)
- Tracks last activity for audit
- Session is validated on every request: JWT `sid` must match an active `AdminSession` record
- On logout or revocation: session row is soft-deleted (`revokedAt` set), JWT becomes invalid immediately

### Token Lifecycle
```
[Login] → JWT issued (24h TTL) + AdminSession created
   │
   ├─ [API Request] → Validate JWT signature + expiry + active session
   │
   ├─ [Refresh] → New JWT + new session ID (old session revoked)
   │
   ├─ [Logout] → Session revoked, JWT invalid
   │
   └─ [Expiry] → JWT naturally expires, client redirects to login
```

---

## 3. RBAC Roles

### Role Definitions

| Role       | Scope      | Capabilities                                                    |
|------------|------------|----------------------------------------------------------------|
| `OWNER`    | Per-group  | Full group management: settings, members, logs, export, pause/resume, manage admins |
| `ADMIN`    | Per-group  | Read + manage: members, logs, export. Cannot manage other admins or delete group config |
| `VIEWER`   | Per-group  | Read-only: view members, logs, stats. Cannot modify anything   |

### Role Assignment
- First admin to run `/setup` in a group is auto-assigned `OWNER`
- `OWNER` can invite other admins via bot command (`/admin add <@user> <role>`) or dashboard
- Group claim flow (T-112) allows existing group owners to claim admin access

### Role Enforcement
- Authorization middleware resolves `adminUserId` from JWT
- Queries `GroupAdmin` to determine role for the requested `groupId`
- No `GroupAdmin` record → `403 Forbidden`
- Insufficient role for action → `403 Forbidden`
- All denials are logged in audit trail

---

## 4. Threat Model

### T1: Unauthorized API Read (No Auth)
- **Threat**: Anyone with the Railway URL can read group data, member info, audit logs
- **Mitigation**: JWT auth middleware on all `/api/*` endpoints (except `/api/health` and `/api/auth/*`)
- **Rejection**: `401 Unauthorized` with `{ error: "Authentication required" }`

### T2: Cross-Tenant Access (Horizontal Privilege Escalation)
- **Threat**: Admin A guesses/enumerates Admin B's group ID and reads their data
- **Mitigation**: Every group-scoped query is filtered by `GroupAdmin` membership. No group data is returned unless the authenticated admin has an active `GroupAdmin` record for that group
- **Rejection**: `403 Forbidden` with `{ error: "Access denied" }` (no group details leaked)
- **Logging**: All cross-tenant access attempts are logged with admin ID and target group ID

### T3: Token Leakage / Replay
- **Threat**: JWT is stolen from localStorage or network intercept
- **Mitigation**:
  - Short TTL (24h) limits exposure window
  - Server-side session enables immediate revocation
  - HTTPS-only in production (Railway provides TLS)
  - `auth_date` validation prevents replay of old Telegram Login payloads (5-minute window)
- **Recovery**: Admin logs out (revokes session) or owner can revoke all sessions for a user

### T4: Telegram Login Forgery
- **Threat**: Attacker crafts fake Telegram Login payload
- **Mitigation**: HMAC-SHA256 validation using bot token as secret. Attacker cannot forge without the token
- **Rejection**: `401 Unauthorized` with `{ error: "Invalid authentication" }`

### T5: Session Fixation / Hijacking
- **Threat**: Attacker reuses or fixates a session ID
- **Mitigation**: Session ID is generated server-side (UUIDv4), rotated on refresh, and revoked on logout
- **Additional**: Session includes creation IP/UA for audit (not enforced, just logged)

### T6: Sensitive Data Exposure
- **Threat**: API responses include `setupCode`, internal verification addresses, or full audit payloads
- **Mitigation**: Explicit DTO layer (T-115) whitelists fields. `setupCode` is never returned in API responses
- **Validation**: Regression tests verify no sensitive field leakage

### T7: Privilege Escalation (Vertical)
- **Threat**: `VIEWER` modifies settings or `ADMIN` manages other admins
- **Mitigation**: Role check on every mutation endpoint. Role hierarchy: `OWNER > ADMIN > VIEWER`
- **Rejection**: `403 Forbidden`

---

## 5. API Endpoint Plan

### Auth Endpoints (No auth required)

| Method | Path                  | Purpose                                    |
|--------|-----------------------|--------------------------------------------|
| POST   | `/api/auth/telegram`  | Validate Telegram Login and issue JWT      |
| POST   | `/api/auth/refresh`   | Refresh JWT (requires valid current JWT)   |
| POST   | `/api/auth/logout`    | Revoke current session                     |
| GET    | `/api/auth/me`        | Return current admin profile + group roles |

### Protected Endpoints (Existing, now auth-gated)

| Method | Path                  | Min Role   | Change                              |
|--------|-----------------------|------------|--------------------------------------|
| GET    | `/api/health`         | None       | Remains public                       |
| GET    | `/api/groups`         | Any auth   | Filtered to admin's groups only      |
| GET    | `/api/groups/:id`     | `VIEWER`+  | Tenant-scoped, no setupCode in response |

---

## 6. Environment Variables (New)

| Variable              | Owner   | Required | Default  | Description                            |
|-----------------------|---------|----------|----------|----------------------------------------|
| `ADMIN_JWT_SECRET`    | Railway | Yes*     | —        | HS256 signing secret for JWTs          |
| `ADMIN_SESSION_TTL_SEC` | Railway | No     | `86400`  | JWT/session expiry in seconds          |
| `ADMIN_AUTH_ENABLED`  | Railway | No       | `true`   | Feature flag: set `false` only for emergency rollback |

\* Required in normal operation (auth enabled by default). If auth is disabled, endpoints remain open only for emergency rollback.

---

## 7. Rollout Strategy (Preview)

Detailed in T-119. Summary:

1. **Hard enforcement (default)** (`ADMIN_AUTH_ENABLED=true`): Auth required on protected endpoints
2. **Emergency rollback mode** (`ADMIN_AUTH_ENABLED=false`): temporary open mode for incident response only

This allows existing deployments to adopt auth incrementally without breaking the demo flow.
