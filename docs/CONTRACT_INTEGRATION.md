# Contract External Deployment Integration

## Overview

BCHubKey does not deploy or manage on-chain contracts directly.
Token category IDs (CashTokens genesis txids) and verification addresses
are configured at runtime through the Telegram admin wizard, stored in `gate_rules`.

This means:
- **No app redeploy is needed** when token contracts change
- **Each group** can gate on a different token
- **Token addresses** are per-gate-rule, not global env vars

## Contract Artifact Handoff Format

When a new CashToken is deployed (FT or NFT), the admin needs:

| Field | Format | Example |
|-------|--------|---------|
| Token Category ID | 64-char lowercase hex (genesis txid) | `a1b2c3d4...` |
| Gate Type | `FT` or `NFT` | `FT` |
| Minimum Balance | Human-readable amount (FT) or count (NFT) | `100` or `1` |
| Decimals | Integer (FT only) | `8` |

The admin enters these values in the `/setup` wizard. No config files or env vars needed.

## Verification Address

The verification address (where users send micro-tx for ownership proof) is also
per-gate-rule. The admin provides it during setup. This is typically a BCH address
the admin controls (to receive the micro-tx deposits).

## Startup Validation

The app validates chain configuration at startup (`src/util/config.ts`):
- `CHAIN_PROVIDER` must be `FULCRUM`
- `FULCRUM_URL` protocol is checked (wss://, ws://, tcp://)
- `DATABASE_URL` must be a PostgreSQL connection string

Invalid config causes a fast fail with clear error messages.

## Per-Environment Contract Addresses

Since token category IDs are stored in the database (not env vars),
there is no env-var-based contract address management needed.

To use different tokens in different environments:
1. Deploy/use the token on the target network (mainnet or chipnet)
2. Run `/setup` in the Telegram group and enter the token category ID
3. The gate rule is stored in the database for that group

This design avoids the common problem of needing to redeploy the app
when contract addresses change.
