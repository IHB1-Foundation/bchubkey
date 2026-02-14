# Deploy Topology — BCHubKey

This document defines the frozen target runtime topology for BCHubKey.
All implementation tickets (T-101 through T-107) must follow this boundary definition.

---

## Service Map

| Service         | Platform  | Runtime / Stack                | Notes                                         |
|-----------------|-----------|-------------------------------|-----------------------------------------------|
| **Core**        | Railway   | Node.js 20 (single process)  | Bot + verify worker + jobs + JSON API          |
| **Database**    | Railway   | Postgres (Railway plugin)     | Prisma ORM, migrations via `prisma migrate deploy` |
| **Admin FE**    | Vercel    | Static / SSR (future option)  | Fetches data from Core JSON API via CORS       |
| **Contracts**   | External  | BCH mainnet / chipnet         | Deployed separately; addresses passed via env  |

### Single-Process Core Decision

Railway runs **one service** containing bot, verify worker, scheduler jobs, and the JSON API.
Rationale: the bot, worker, and API share Prisma client and in-memory caches. Splitting would add
inter-service communication overhead without meaningful benefit at hackathon scale.

The admin dashboard HTTP server (currently rendering HTML) will be converted to a JSON API.
Vercel FE will consume these JSON endpoints.

---

## Environment Variable Ownership

### Railway (Core service)

| Variable                        | Required | Description                                  |
|---------------------------------|----------|----------------------------------------------|
| `DATABASE_URL`                  | Yes      | Postgres connection string (Railway plugin)  |
| `TELEGRAM_BOT_TOKEN`           | Yes      | Bot token from @BotFather                    |
| `BOT_PUBLIC_NAME`              | Yes      | Bot username for deep link generation        |
| `CHAIN_PROVIDER`               | No       | Default: `FULCRUM`                           |
| `FULCRUM_URL`                  | No       | Default: `wss://bch.imaginary.cash:50004`    |
| `TOKEN_METADATA_PROVIDER`      | No       | `PAYTACA_BCMR` or `NONE`                    |
| `PAYTACA_BCMR_BASE_URL`       | No       | Default: `https://bcmr.paytaca.com/api`      |
| `METADATA_TIMEOUT_MS`         | No       | Default: `5000`                              |
| `METADATA_MAX_RETRIES`        | No       | Default: `2`                                 |
| `LOG_LEVEL`                    | No       | Default: `info`                              |
| `POLL_INTERVAL_SEC`           | No       | Default: `15`                                |
| `DEFAULT_VERIFY_MIN_SAT`      | No       | Default: `2000`                              |
| `DEFAULT_VERIFY_MAX_SAT`      | No       | Default: `2999`                              |
| `DEFAULT_VERIFY_EXPIRE_MIN`   | No       | Default: `10`                                |
| `DEFAULT_RECHECK_INTERVAL_SEC`| No       | Default: `300`                               |
| `DEFAULT_GRACE_PERIOD_SEC`    | No       | Default: `300`                               |
| `ADMIN_PORT`                   | No       | JSON API port; on Railway use `${PORT}`      |
| `ADMIN_CORS_ORIGIN`           | No       | Vercel FE domain for CORS (e.g. `https://bchubkey.vercel.app`) |
| `ADMIN_AUTH_ENABLED`          | No       | `true` to enforce JWT auth on admin API (default: `false`)     |
| `ADMIN_JWT_SECRET`            | *        | HS256 signing secret (required when auth enabled, 32+ chars)   |
| `ADMIN_SESSION_TTL_SEC`       | No       | JWT/session expiry in seconds (default: `86400`)               |

### Vercel (Admin FE)

| Variable          | Required | Description                                      |
|-------------------|----------|--------------------------------------------------|
| `API_BASE_URL`    | Yes      | Railway Core JSON API URL (e.g. `https://bchubkey-core.up.railway.app`) |
| `BOT_USERNAME`    | No       | Telegram bot username for Login Widget (e.g. `BCHubKeyBot`)            |

### Contract Deploy Pipeline (External)

No runtime env vars in the app. Contract addresses are configured in gate rules via the
admin wizard at runtime (token category IDs are entered per group, not hardcoded in env).

The verification address is also configured per gate rule, not as a global env var.

---

## Network Boundaries

```
┌─────────────┐      HTTPS/JSON       ┌──────────────────────────┐
│  Vercel FE  │ ────────────────────► │  Railway Core Service     │
│  (Admin UI) │ ◄──────────────────── │  ┌─────────────────────┐  │
└─────────────┘      CORS-enabled     │  │ Telegram Bot (poll)  │  │
                                       │  │ Verify Worker        │  │
                                       │  │ Scheduler Jobs       │  │
┌─────────────┐   Telegram Bot API    │  │ JSON API (:PORT)     │  │
│  Telegram   │ ◄──────────────────► │  └─────────────────────┘  │
│  Servers    │                       │           │               │
└─────────────┘                       │           ▼ Prisma        │
                                       │  ┌─────────────────────┐  │
┌─────────────┐   Electrum Protocol   │  │ Railway Postgres     │  │
│  Fulcrum    │ ◄──────────────────► │  └─────────────────────┘  │
│  Server     │   (WSS)              └──────────────────────────┘
└─────────────┘
```

---

## Migration Path (MySQL → Postgres)

1. **T-101**: Change Prisma datasource to `postgresql`, fix MySQL-only types, create baseline migration
2. **T-102**: Update docker-compose, .env.example, docs for local Postgres
3. **T-103**: Update Railway deploy docs for Postgres plugin
4. **T-104**: Convert admin HTML server to JSON API endpoints
5. **T-105**: Wire Vercel FE to Railway JSON API
6. **T-106**: Add contract address config loader (env-driven, no hardcode)
7. **T-107**: CI/CD pipeline and smoke validation

---

## Rollback Strategy

- Railway supports instant rollback to previous deploy
- Prisma migrations are forward-only in production (`migrate deploy`); manual rollback SQL if needed
- Vercel supports instant rollback to previous deployment
- Contract deploys are immutable on-chain; new addresses require config update
