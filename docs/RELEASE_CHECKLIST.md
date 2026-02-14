# Release Checklist

## Pre-Deploy Checks

- [ ] CI pipeline passes (build, lint, format, typecheck, migration validation)
- [ ] Local Postgres smoke test passes (`npx tsx scripts/smoke-db.ts`)
- [ ] Security tests pass (`npm run test:security`)
- [ ] `npm run build` succeeds with no errors

## Deploy Order

Follow this order to avoid cross-platform inconsistencies:

### 1. Contract Deploy (if applicable)
- [ ] Deploy or update CashToken contract on target network
- [ ] Record token category ID (64-char hex)
- [ ] No app redeploy needed — admin enters token ID via `/setup`

### 2. Railway Core Deploy
- [ ] Push to main branch (triggers Railway auto-deploy)
- [ ] Verify `prisma migrate deploy` succeeds in Railway logs
- [ ] Verify bot process starts successfully

### 3. Vercel FE Deploy
- [ ] Verify `API_BASE_URL` env var points to correct Railway service
- [ ] Verify `BOT_USERNAME` env var is set (for Telegram Login Widget)
- [ ] Push or trigger Vercel deploy
- [ ] Verify `generate-env.sh` runs and generates `env.js`

## Post-Deploy Smoke Checks

### Railway Core
- [ ] **Health endpoint**: `GET {RAILWAY_URL}/api/health` returns `200 OK`
  ```bash
  curl -s https://your-railway-url/api/health | jq .
  ```
- [ ] **Bot responds**: Send `/help` to bot in Telegram
- [ ] **DB connected**: Health endpoint shows `status: "ok"`
- [ ] **Groups API**: `GET /api/groups` returns valid JSON
  ```bash
  curl -s https://your-railway-url/api/groups | jq .
  ```

### Vercel FE
- [ ] **FE loads**: Visit Vercel URL, page renders without JS errors
- [ ] **API connectivity**: Groups list loads (no CORS errors in console)
- [ ] **Health indicator**: Header shows green dot with uptime
- [ ] **Dark mode**: Toggle works and persists
- [ ] **Auth flow**: If `ADMIN_AUTH_ENABLED=true`, login via Telegram works
- [ ] **Tenant isolation**: Logged-in admin sees only their groups

### End-to-End
- [ ] **Setup flow**: Admin can run `/setup` and complete wizard
- [ ] **Verification flow**: User can start verification via deep link
- [ ] **Enforcement**: Recheck job runs at configured interval
- [ ] **Dashboard**: FE shows group data from Railway API

## Rollback Procedure

### Railway
1. Go to Railway dashboard > Deployments
2. Click "Rollback" on the previous successful deployment
3. Verify bot restarts and responds

### Vercel
1. Go to Vercel dashboard > Deployments
2. Click "..." > "Promote to Production" on previous deployment
3. Verify FE loads correctly

### Database
- Prisma migrations are forward-only
- For critical issues, write manual rollback SQL
- Test rollback SQL locally before applying to production
