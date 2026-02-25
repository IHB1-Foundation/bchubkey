# Screenshots Capture Guide

This directory should contain product screenshots for the hackathon submission.

## Required Screenshots

### 1. `setup-wizard.png`
**Admin setup flow in Telegram DM**
- Show the token gate configuration wizard
- Include token type selection, threshold input, and mode selection
- Capture on mobile or desktop Telegram

### 2. `verify-flow.png`
**User verification flow**
- Show the micro-tx instructions with QR code
- Include the verification address and sat amount
- Capture after clicking the deep link

### 3. `dashboard-overview.png`
**Admin dashboard group detail page**
- Show the overview with stats and group/member data
- Capture from the Vercel frontend URL (or local static FE) connected to Railway API

### 4. `gate-result.png` (optional)
**Gate check result message**
- Show the PASS or FAIL message in Telegram
- Include the token balance display

## How to Capture

1. Start the bot in demo mode:
   ```bash
   npm run demo
   ```

2. Open Telegram and interact with your bot

3. For dashboard screenshots:
   - Open deployed FE URL (Vercel) or local FE static host
   - Ensure `API_BASE_URL` points to a live API before capture
   - Use browser DevTools for consistent viewport (1280x800 recommended)

4. Save screenshots as PNG with descriptive names

## Tips

- Use a test group with a memorable name
- Prepare a wallet with tokens for the demo
- Clean up any test data before final screenshots
- Crop/edit to focus on the relevant UI elements
