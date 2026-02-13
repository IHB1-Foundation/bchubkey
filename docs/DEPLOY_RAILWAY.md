# Railway Deploy (Postgres)

This project uses **Prisma + Postgres**. Railway provides managed Postgres and a long-running service for the bot.

## 1) Create Railway services

1. Create a new Railway project
2. Add a **Postgres** database to the project (Railway plugin)
3. Add a **service** for this repo (GitHub deploy)

## 2) Configure environment variables

Set these variables on the Railway service:

| Variable | Required | Source |
|----------|----------|--------|
| `TELEGRAM_BOT_TOKEN` | Yes | @BotFather |
| `BOT_PUBLIC_NAME` | Yes | Your bot's username |
| `DATABASE_URL` | Yes | Railway Postgres plugin connection string |
| `ADMIN_PORT` | No | Set to `${PORT}` to enable JSON API dashboard |
| `ADMIN_CORS_ORIGIN` | No | Vercel FE domain (e.g. `https://bchubkey.vercel.app`) |

Tip: Railway's Postgres plugin exposes `DATABASE_URL` automatically. Reference it with `${{Postgres.DATABASE_URL}}` in the service variable settings.

See `docs/DEPLOY_TOPOLOGY.md` for the full env var ownership matrix.

## 3) Build + start commands

- **Install**: `npm install` (must include devDependencies for Prisma CLI)
- **Build**: `npm run build`
- **Start**: `npm run start:railway`

`start:railway` runs `prisma migrate deploy` before starting the bot process.

**Important**: Prisma CLI (`prisma`) is a devDependency. Ensure Railway's install step does **not** skip devDependencies (i.e., do not set `NPM_CONFIG_PRODUCTION=true` or `--omit=dev`).

## 4) Migration execution order

On each deploy, `npm run start:railway` executes:

1. `prisma migrate deploy` — applies any pending migrations
2. `node dist/index.js` — starts the bot process

If a migration fails, the process exits non-zero and Railway does **not** start the app.

## 5) Rollback handling

- **App rollback**: Railway supports instant rollback to a previous deployment
- **DB rollback**: Prisma does not generate down migrations. If a migration must be reverted, write manual SQL and apply via `psql` or Railway's data tab
- **Recommendation**: Test migrations locally before pushing to main

## 6) Optional: Admin dashboard / JSON API

The admin API is disabled by default. To enable it on Railway:

- Set `ADMIN_PORT=${PORT}`
- Optionally set `ADMIN_CORS_ORIGIN` for the Vercel FE domain

## 7) Health check

Railway can ping the admin API health endpoint (when enabled) at:

```
GET /api/health
```

Returns `200 OK` with system status JSON.
