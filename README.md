# BCHubKey

CashTokens-Gated Telegram Group Automation Bot

## Requirements

- Node.js 20+
- npm

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment template and configure:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and fill in required values:
   - `TELEGRAM_BOT_TOKEN` - Get from @BotFather
   - `BOT_PUBLIC_NAME` - Your bot's username

## Development

Run in development mode with hot reload:
```bash
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled JS |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |

## Project Structure

```
src/
├── index.ts      # Entrypoint
├── bot/          # Telegraf setup, commands, callbacks
├── domain/       # Entities, state machines, policy
├── db/           # Prisma client, repositories
├── chain/        # ChainAdapter (Fulcrum)
├── verify/       # Micro-tx verification engine
├── gate/         # Token gate evaluation + enforcement
├── jobs/         # Scheduled jobs (recheck, grace, cleanup)
├── admin/        # Optional web dashboard
└── util/         # Logging, validation, helpers
```

## Demo & Submission

| Document | Description |
|----------|-------------|
| [DEMO.md](./DEMO.md) | Demo script + failure playbook |
| [docs/submission/PITCH_DECK.md](./docs/submission/PITCH_DECK.md) | Pitch deck outline |
| [docs/submission/VIDEO_GUIDE.md](./docs/submission/VIDEO_GUIDE.md) | Video recording guide |

## Features

- **Token Gate Setup** - Admin wizard in Telegram DM
- **Ownership Proof** - Micro-tx verification (prevents address copying)
- **FT/NFT Support** - Gate by fungible token balance or NFT count
- **Auto Enforcement** - Scheduled rechecks + grace period handling
- **Admin Commands** - /settings, /members, /audit, /export, /pause, /resume

## Architecture

Built with:
- TypeScript + Node.js 20
- Telegraf (Telegram Bot API)
- Prisma + SQLite
- Fulcrum (Electrum Cash Protocol)
- BCMR for token metadata
