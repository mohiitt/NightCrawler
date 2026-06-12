# @nightcrawler/web — Teammate C

Next.js UI for NIGHTCRAWLER: ConspiracyBoard visualization, SSE stream consumer, x402-gated alpha paywall.

## Quick start (mock mode)

```bash
# From monorepo root
cp .env.local.example .env.local
pnpm install
pnpm --filter @nightcrawler/web dev
```

Open http://localhost:3000, click **Start Run**. The UI replays `packages/contracts/fixtures/mock_events.ndjson` over SSE and pauses at the Guild approval gate.

## Teammate C deliverables

| Task | Location |
|------|----------|
| ConspiracyBoard (react-flow fallback) | `src/components/ConspiracyBoard/` |
| C1 GenUI registration + optional renderer | `src/lib/c1Registration.ts`, `C1ConspiracyBoard.tsx` |
| SSE consumer + dashboard | `src/components/NightcrawlerDashboard.tsx` |
| API routes | `src/app/api/{run,stream,approve,alpha}/` |
| x402 paywall | `src/app/api/alpha/route.ts` |
| Buyer bot | `../buyer/src/buyer_bot.ts` |

## Environment

See `.env.local.example` (Teammate C section):

- `MOCK_STREAM=true` — replay fixtures (default until `apps/agent` is wired)
- `SELLER_ADDRESS` + `X402_FACILITATOR_URL` — enable x402 on `/api/alpha`
- `NEXT_PUBLIC_USE_C1=true` + `THESYS_C1_API_KEY` — use Thesys C1 instead of react-flow

## Integration (Phase 2)

Set `MOCK_STREAM=false` and `AGENT_SERVICE_URL=http://localhost:8787`. The web app proxies `/api/run`, `/api/stream`, and `/api/approve` to the agent service.

## Buyer unlock demo

After a run completes:

```bash
RUN_ID=<your-run-id> WEB_URL=http://localhost:3000 pnpm --filter @nightcrawler/buyer buy
```
