# BCHubKey Pitch Deck Outline

## Slide 1: Title
**BCHubKey**
*CashTokens-Gated Telegram Group Automation*

- Your Name / Team
- Hackathon Name + Date

---

## Slide 2: The Problem
**"Token gating" in Telegram is broken**

- Manual moderation doesn't scale
- Copy/paste whale addresses bypass verification
- Balance changes aren't tracked over time
- Result: Communities degrade, spam wins

*Visual: sad Telegram group flooded with spam*

---

## Slide 3: The Solution
**BCHubKey = Automated Token Gating with Ownership Proof**

Three key innovations:
1. **Micro-tx ownership proof** - Proves you control the address
2. **Continuous enforcement** - Balance rechecks + grace periods
3. **Zero admin overhead** - Fully automated approve/restrict/kick

*Visual: flow diagram showing verify -> check -> enforce loop*

---

## Slide 4: How It Works
**User Flow (90 seconds)**

1. Click verification link
2. Enter BCH address
3. Send micro-tx (~2500 sats)
4. Bot verifies ownership + token balance
5. Access granted instantly

*Visual: screenshot sequence or simple flow diagram*

---

## Slide 5: Live Demo
**Watch it work**

- Admin: `/settings` shows configuration
- User: Verify -> PASS -> Access
- User: Transfer tokens away
- System: Auto-recheck -> Restrict/Kick

*(Switch to live demo or pre-recorded video)*

---

## Slide 6: Technical Highlights
**Built on Bitcoin Cash**

- **CashTokens** for membership (FT/NFT)
- **Electrum Protocol** (Fulcrum) for chain queries
- **BCMR** for token metadata
- **Telegram Bot API** via Telegraf

Stack: TypeScript, Node.js, Prisma/SQLite

---

## Slide 7: Why CashTokens?
**On-chain membership has real utility**

- Membership as a tradeable asset
- Verifiable without trusted third party
- Works with existing BCH wallets
- Low fees make micro-tx verification practical

---

## Slide 8: Features (MVP)
**What's built and working:**

- Admin setup wizard (all in Telegram)
- Micro-tx ownership verification
- FT and NFT token gate support
- Automated recheck + grace enforcement
- Admin commands: /members, /audit, /export
- Pause/resume enforcement

---

## Slide 9: Roadmap
**Post-Hackathon**

- Signature-based ownership proof option
- Tiered access levels
- Multi-group dashboard
- Real-time WebSocket notifications

---

## Slide 10: Call to Action
**Try it yourself**

- Bot: @YourBotUsername
- Repo: github.com/your/repo
- Demo video: [link]

**Questions?**

---

## Talking Points Cheat Sheet

### Opening (30s)
"Token-gated communities are supposed to be exclusive. In reality, anyone can paste a whale address and get in. BCHubKey fixes this by requiring ownership proof."

### Technical credibility (15s)
"We use the Electrum protocol via Fulcrum for reliable chain queries, micro-transactions for ownership proof, and CashTokens for the actual membership check."

### Demo transition (10s)
"Let me show you how a user verifies in under 2 minutes..."

### Post-demo (15s)
"What you just saw: ownership proof, balance check, automatic access. If I transfer my tokens away, the bot will recheck and revoke access automatically."

### Closing (10s)
"BCHubKey turns CashTokens into real community access control. Thank you."
