# BCHubKey Demo Script

## Pre-Demo Setup

### 1. Environment Configuration
```bash
# Copy and configure environment
cp .env.example .env

# Required settings:
TELEGRAM_BOT_TOKEN=<your-bot-token>
BOT_PUBLIC_NAME=<your-bot-username>
DATABASE_URL=mysql://bchubkey:bchubkey@localhost:3306/bchubkey

# Enable demo mode (fast cycle):
DEFAULT_RECHECK_INTERVAL_SEC=60
DEFAULT_GRACE_PERIOD_SEC=0
DEFAULT_VERIFY_EXPIRE_MIN=5
POLL_INTERVAL_SEC=10
```

### 2. Database Setup
```bash
docker compose up -d mysql
npx prisma migrate dev
```

### 3. Prepare Demo Tokens
- Have a wallet with test CashTokens (FT or NFT)
- Know the token category ID (64-char hex)
- Prepare to send ~2500 sats for verification

### 4. Telegram Setup
- Create a test group/supergroup
- Add the bot as admin with permissions:
  - Manage chat
  - Ban users
  - Restrict members
  - Invite users

---

## Demo Flow (2-3 minutes)

### Part 1: Admin Setup (~1 minute)

1. **Admin runs `/setup` in the group**
   - Bot posts "Open Setup Wizard" button
   - Click button to open DM

2. **Complete wizard in DM:**
   - Select gate type: FT or NFT
   - Enter token category ID
   - Enter minimum threshold
   - Select mode: JOIN_REQUEST or RESTRICT
   - Enter recheck interval (1 min for demo)
   - Enter grace period (0 for demo)
   - Enter verification address (your receive address)
   - Accept defaults for sat range

3. **Receive deep link**
   - Copy the verification link
   - Pin in the group

4. **Verify setup with `/settings`**
   - Shows all configured parameters

### Part 2: User Verification (~1 minute)

5. **User clicks pinned verification link**
   - Opens DM with bot
   - Shows group info and requirements

6. **User enters BCH address**
   - Bot validates cashaddr format
   - Shows "Proceed to Verification" button

7. **User clicks proceed**
   - Bot generates unique sat amount (e.g., 2547 sats)
   - Shows instructions: send X sats to verification address

8. **User sends micro-transaction**
   - From the claimed address
   - Exact amount shown

9. **User clicks "I've Sent It"**
   - Bot polls for transaction (10-15s)
   - Verifies input addresses match claimed address

10. **SUCCESS: Ownership verified**
    - Bot checks token balance
    - If PASS: approves/unrestricts user
    - User receives DM notification

### Part 3: Enforcement Demo (~30 seconds)

11. **User transfers tokens away**
    - Move tokens to different address

12. **Wait for recheck (1 minute)**
    - Or run manual recheck

13. **User becomes FAIL**
    - With grace=0: immediately restricted/kicked
    - Admin sees status change via `/members`

14. **Show admin commands**
    - `/settings` - current configuration
    - `/members` - PASS/FAIL/PENDING counts
    - Show audit logs if time permits

---

## Failure Playbook

### Issue: Bot doesn't respond
**Symptoms:** No response to any commands
**Check:**
1. Is bot running? `npm run dev`
2. Check logs for errors
3. Verify `TELEGRAM_BOT_TOKEN` is correct
**Fix:** Restart bot, check token

### Issue: "/setup" shows "Missing permissions"
**Symptoms:** Bot can't verify admin rights
**Check:**
1. Is caller actually a group admin?
2. Does bot have "Manage chat" permission?
**Fix:** Make user admin or grant bot permissions

### Issue: Verification link doesn't work
**Symptoms:** Deep link shows error
**Check:**
1. Is `BOT_PUBLIC_NAME` set correctly?
2. Has setup been completed for this group?
**Fix:** Check .env, run /setup again

### Issue: Transaction not detected
**Symptoms:** User sent tx but bot doesn't see it
**Check:**
1. Is the amount exactly correct?
2. Was it sent FROM the claimed address?
3. Is Fulcrum server reachable?
4. Check logs: `module: "verify:worker"`
**Fix:**
- Wait 15-30 more seconds
- Click "Refresh Status"
- If still fails, have user retry with exact amount

### Issue: Verification FAILED despite correct tx
**Symptoms:** Tx found but ownership failed
**Check:**
1. Did user send FROM claimed address (not TO)?
2. Is the address type P2PKH? (P2SH may have issues)
**Fix:** Have user try a standard P2PKH wallet (Electron Cash, etc.)

### Issue: Gate check shows 0 balance
**Symptoms:** User has tokens but balance shows 0
**Check:**
1. Is token category ID correct? (64-char hex, lowercase)
2. Are tokens on the verified address?
3. Check Fulcrum logs for errors
**Fix:** Verify token ID, ensure tokens are on correct address

### Issue: Enforcement not happening
**Symptoms:** User is FAIL but not restricted
**Check:**
1. Is group status ACTIVE? (not PAUSED)
2. Is grace period still active?
3. Does bot have "Restrict members" permission?
**Fix:** Check `/settings`, verify bot permissions

### Issue: Join request not approved
**Symptoms:** User verified PASS but still pending
**Check:**
1. Is mode set to JOIN_REQUEST?
2. Did user have a pending join request?
3. Check audit logs for UNRESTRICT action
**Fix:** User may already be in group; check Telegram member list

---

## Quick Recovery Commands

```bash
# Check bot status
npm run dev

# View recent logs
# (logs appear in console)

# Reset database (WARNING: loses all data)
docker compose down -v
docker compose up -d mysql
npx prisma migrate dev

# Quick settings check in Telegram
/settings

# Quick member check
/members
```

---

## Demo Tips

1. **Use a second device/account** for the "judge" role
2. **Pre-fund the demo address** with test tokens
3. **Keep Electron Cash open** for quick tx sending
4. **Have fallback wallet** in case of tx issues
5. **Test the full flow** 30 minutes before demo
6. **Keep terminal visible** for live log viewing

---

## Expected Demo Timeline

| Step | Time | Cumulative |
|------|------|------------|
| Show /settings | 15s | 0:15 |
| User clicks link | 10s | 0:25 |
| Enter address | 15s | 0:40 |
| Send micro-tx | 30s | 1:10 |
| Verification completes | 20s | 1:30 |
| Show PASS status | 10s | 1:40 |
| Transfer tokens away | 30s | 2:10 |
| Recheck + enforce | 60s | 3:10 |
| Show /members | 10s | 3:20 |

Total: ~3 minutes including buffer
