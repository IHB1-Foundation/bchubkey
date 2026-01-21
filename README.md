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
