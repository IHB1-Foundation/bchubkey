# BCHubKey

**CashTokens-Gated Telegram Group Automation Bot**

Automatically gate and manage Telegram groups based on BCH CashTokens holdings, with ownership proof and automatic enforcement.

`Network policy:` BCH testnet only (`bchtest:` addresses + testnet Fulcrum).

## Requirements

- Node.js 20+
- npm
- Docker (for local Postgres)

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

4. Start Postgres locally and run migrations:
   ```bash
   docker compose up -d postgres
   npx prisma migrate dev
   ```

Deployment and operations documentation is maintained in private internal docs.

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
├── admin/        # Optional admin JSON API
└── util/         # Logging, validation, helpers
```

## Demo

```bash
npm run demo
```

This starts a fast demo profile for verification and enforcement flows.

## Features

- **Token Gate Setup** - Admin wizard in Telegram DM
- **Ownership Proof** - Micro-tx verification (prevents address copying)
- **FT/NFT Support** - Gate by fungible token balance or NFT count
- **Auto Enforcement** - Scheduled rechecks + grace period handling
- **Admin Commands** - /settings, /members, /audit, /export, /pause, /resume

## Architecture

Built with:
- **TypeScript + Node.js 20** - Type-safe, modern runtime
- **Telegraf** - Telegram Bot API framework
- **Prisma + Postgres** - Type-safe ORM with Railway-compatible database
- **Fulcrum** - Electrum Cash Protocol for chain queries
- **BCMR** - Token metadata resolution

### Key Components

| Component | Purpose |
|-----------|---------|
| Bot Server | Handles Telegram commands, callbacks, and wizard flows |
| Verify Engine | Micro-tx ownership proof validation |
| Gate Logic | FT/NFT balance checks and PASS/FAIL evaluation |
| Jobs | Scheduled rechecks and grace period enforcement |
| Admin Dashboard | Read-only web UI for monitoring (optional) |

### Data Flow

1. **User** clicks deep link and starts verification in DM
2. **Bot** creates verify session with unique sat amount
3. **User** sends micro-tx from their claimed address
4. **Verify Engine** polls Fulcrum for matching tx
5. **Gate Logic** checks token balance and evaluates PASS/FAIL
6. **Bot** enforces access (approve/restrict/kick) via Telegram API
7. **Jobs** periodically recheck and enforce grace periods
