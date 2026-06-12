# NIGHTCRAWLER

Autonomous OSINT & Alpha Broker. Reads the open web, corroborates anomalies
across independent data vectors, gates publication behind human approval, and
sells the resulting "alpha" to other agents over an x402 payment rail.

See `FINAL-PLAN.md` for the full technical plan and the 3-person parallel build.

## Monorepo layout

```
packages/
  contracts/   FROZEN shared types/schemas/fixtures (Signal, events, API, ConspiracyBoard)
  db/          DB access seam: query() over ClickHouse | SQLite
apps/
  ingest/      Teammate A - schema bootstrap + seed_db (Golden Path) + Airbyte
  agent/       Teammate B - Guild.ai agent, corroboration loop, gate, Langfuse, Composio
  web/         Teammate C - Next.js + Thesys C1/OpenUI ConspiracyBoard + x402 /api/alpha
  buyer/       Teammate C - mock buyer bot that pays the x402 paywall
```

## Setup

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate
pnpm install
cp .env.local.example .env.local   # fill in per-track keys
pnpm typecheck
```

## The contract-first rule

Everything in `packages/contracts` is frozen as of Phase 0. Build against it and
the fixtures (`packages/contracts/fixtures/`) so all three tracks run in parallel.
Change a contract only with team sign-off.

## Data flow

```
ingest/seed -> ClickHouse/SQLite -> agent (execute_sql -> corroborate -> Signal)
  -> SSE /api/stream -> web ConspiracyBoard
  -> Guild approval gate -> Composio cited.md
  -> x402 /api/alpha <- buyer_bot (USDC on Base Sepolia)
```
