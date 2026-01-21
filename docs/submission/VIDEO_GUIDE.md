# BCHubKey Demo Video Recording Guide

## Video Specs
- **Length:** 2-3 minutes maximum
- **Format:** MP4, 1080p preferred
- **Audio:** Clear voiceover, minimize background noise

## Recording Setup

### Screen Recording
- Use OBS, QuickTime, or Loom
- Capture both Telegram windows (admin + user)
- Keep terminal visible for log output

### Recommended Layout
```
+------------------+------------------+
|   Admin Phone    |   User Phone     |
|   (Telegram)     |   (Telegram)     |
+------------------+------------------+
|           Terminal Logs             |
+-------------------------------------+
```

Alternative: Split screen or picture-in-picture

---

## Script Outline

### 0:00-0:15 - Introduction
"BCHubKey is a Telegram bot that automatically gates group access based on CashToken holdings, with real ownership proof."

**Show:** Bot info screen or /help

### 0:15-0:30 - Setup Preview
"Admins configure the gate in a simple wizard. Here's a group already set up."

**Show:** `/settings` command output

### 0:30-1:00 - User Verification
"A new user clicks the verification link and enters their BCH address..."

**Show:**
1. Click deep link
2. Bot welcome message
3. Enter cashaddr
4. See micro-tx instructions

### 1:00-1:30 - Ownership Proof
"The user sends a small amount from their address to prove ownership..."

**Show:**
1. Send tx in wallet (Electron Cash recommended)
2. Click "I've Sent It"
3. Wait for detection
4. SUCCESS message

### 1:30-1:50 - Token Gate Check
"The bot checks the user's token balance and grants access automatically..."

**Show:**
1. Gate check message
2. PASS status
3. User can now send messages in group

### 1:50-2:20 - Enforcement Demo
"If the user transfers their tokens away, the bot rechecks and revokes access..."

**Show:**
1. Transfer tokens to different address
2. Wait for recheck (or mention it happens automatically)
3. FAIL status notification
4. User restricted/kicked

### 2:20-2:40 - Admin Features
"Admins can monitor everything from Telegram..."

**Show:**
1. `/members` summary
2. `/audit @user` (optional)

### 2:40-2:50 - Closing
"BCHubKey: real token gating for Telegram communities, powered by Bitcoin Cash."

**Show:** Bot name or logo

---

## Pro Tips

### Before Recording
- [ ] Test the full flow works
- [ ] Pre-fund demo wallet with tokens
- [ ] Clear any test data if needed
- [ ] Enable demo mode settings

### During Recording
- Speak slowly and clearly
- Pause at key moments
- Don't rush the micro-tx verification

### After Recording
- Trim any dead air
- Add simple captions if possible
- Keep file size under 100MB

---

## Fallback Plan

If live demo has issues:
1. Pre-record a successful flow
2. Have screenshots ready
3. Explain verbally what would happen

---

## Sample Voiceover Script

*[COPY AND PRACTICE THIS]*

"BCHubKey is a Telegram bot that automatically manages group access based on CashToken holdings.

Here's how it works. When a new user wants to join, they click a verification link, enter their BCH address, and send a small micro-transaction to prove they own it.

The bot detects the transaction, verifies ownership by checking the input addresses, then checks the user's token balance. If they have enough tokens, they get instant access.

But the real power is in continuous enforcement. If this user transfers their tokens away... [wait] ...the bot will automatically recheck and restrict their access.

Admins can see member status at any time with simple commands. No manual moderation needed.

BCHubKey: real token gating, powered by Bitcoin Cash."

---

## Submission Checklist

- [ ] Video is under 3 minutes
- [ ] Audio is clear
- [ ] Demo shows: verify, pass, (optional) fail
- [ ] No sensitive data visible
- [ ] File uploaded to submission platform
