# Admin Auth Rollout Plan

> Staged rollout for M11 admin authentication (T-110 through T-119).
> Goal: introduce auth without breaking live admin operations.

---

## Feature Flag

| Env Variable | Values | Default | Description |
|---|---|---|---|
| `ADMIN_AUTH_ENABLED` | `true` / `false` | `false` | When `false`, all API endpoints remain open (pre-M11 behavior) |
| `ADMIN_JWT_SECRET` | string (32+ chars) | — | Required when auth is enabled |
| `ADMIN_SESSION_TTL_SEC` | number | `86400` | Session/JWT expiry in seconds |

---

## Rollout Stages

### Stage 1: Shadow Mode (Default)

**Config**: `ADMIN_AUTH_ENABLED=false` (or unset)

**Behavior**:
- Auth endpoints (`/api/auth/*`) are available and functional
- Protected endpoints (`/api/groups`, `/api/groups/:id`) remain open — no auth required
- Admin users can log in via Telegram Login to pre-create their `AdminUser` and `GroupAdmin` records
- Auth audit events are still logged (login, logout) for monitoring
- FE shows "Continue without login" link and works as before

**Purpose**: Allow admins to onboard (claim groups via `/claim`, log in) without disruption.

**Checklist**:
- [ ] Deploy Railway with Prisma migration (admin_auth_models)
- [ ] Deploy Vercel FE with updated index.html and env.js
- [ ] Set `BOT_USERNAME` in Vercel env vars
- [ ] Verify `/api/health` shows `authEnabled: false`
- [ ] Admins can use `/claim` in groups to register
- [ ] Admins can log in via Telegram Login Widget on dashboard
- [ ] Dashboard still works without login (backward compatible)

---

### Stage 2: Soft Enforcement

**Config**: `ADMIN_AUTH_ENABLED=true`, `ADMIN_JWT_SECRET=<secret>`

**Behavior**:
- All protected endpoints require valid JWT
- Unauthenticated requests get `401 Unauthorized`
- Tenant isolation enforced: admins only see their own groups
- FE redirects unauthenticated users to login view
- Auth audit events include denial tracking

**Pre-requisites** (before enabling):
- [ ] All active admins have claimed their groups via `/claim` or `/setup`
- [ ] Run `npx tsx scripts/bootstrap-admins.ts` if there are unclaimed groups
- [ ] `ADMIN_JWT_SECRET` is set to a strong random value (32+ chars)
- [ ] `BOT_USERNAME` is set in Vercel env vars

**Checklist**:
- [ ] Set `ADMIN_AUTH_ENABLED=true` and `ADMIN_JWT_SECRET` on Railway
- [ ] Redeploy Railway
- [ ] Verify `/api/health` shows `authEnabled: true`
- [ ] Verify `/api/groups` returns `401` without auth token
- [ ] Verify login via Telegram Login Widget works
- [ ] Verify logged-in admin sees only their groups
- [ ] Verify cross-tenant access returns `403`
- [ ] Run security tests: `npm run test:security`
- [ ] Monitor audit logs for unexpected auth failures

---

### Stage 3: Hard Enforcement (Production)

**Config**: Same as Stage 2. No additional config changes.

**Behavior**: Same as Stage 2, but with confidence that all admins are onboarded.

**Additional hardening** (optional):
- [ ] Reduce `ADMIN_SESSION_TTL_SEC` to 4h (14400) for tighter session control
- [ ] Monitor for session refresh patterns
- [ ] Consider IP-based session validation (log-only, not enforced)

---

## Emergency Rollback

If auth causes issues in production:

1. **Immediate**: Set `ADMIN_AUTH_ENABLED=false` on Railway and redeploy
   - This instantly restores pre-auth behavior
   - No data loss, no migration rollback needed
   - Existing sessions become unused but cause no errors

2. **Verify**: Dashboard works without login after rollback

3. **Investigate**: Check audit logs for the failure pattern

4. **Re-enable**: Fix the issue and re-enable auth

---

## Migration Checklist for Existing Groups

For deployments with pre-existing groups and no admin records:

```bash
# 1. Dry run: see what would be assigned
npx tsx scripts/bootstrap-admins.ts --dry-run

# 2. Apply assignments
npx tsx scripts/bootstrap-admins.ts

# 3. Verify
# - Check admin_users table for expected records
# - Check group_admins table for OWNER assignments
# - Each group should have at least one OWNER
```

---

## Updated Deploy Order

### With Auth Disabled (Stage 1)
1. Railway: deploy with migration → verify health
2. Vercel: deploy with `BOT_USERNAME` → verify FE loads
3. Admins: `/claim` in groups → verify login works

### Enabling Auth (Stage 2)
1. Verify all admins are onboarded (check `group_admins` table)
2. Run bootstrap script if needed
3. Set `ADMIN_AUTH_ENABLED=true` + `ADMIN_JWT_SECRET` on Railway
4. Redeploy Railway
5. Test: login, group access, cross-tenant denial
6. Run security tests
