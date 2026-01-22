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
- Show the overview with stats, chart, and member table
- Enable dark mode for visual appeal
- Capture at http://localhost:3000 during demo

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
   - Open http://localhost:3000
   - Toggle dark mode for better visuals
   - Use browser DevTools for consistent viewport (1280x800 recommended)

4. Save screenshots as PNG with descriptive names

## Tips

- Use a test group with a memorable name
- Prepare a wallet with tokens for the demo
- Clean up any test data before final screenshots
- Crop/edit to focus on the relevant UI elements
