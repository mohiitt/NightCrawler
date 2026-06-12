# apps/web (Teammate C)

Next.js App Router UI for NIGHTCRAWLER.

## Phase 1 setup

Scaffold Next.js in place, then add the GenUI + economy deps:

```bash
pnpm create next-app@latest . --ts --app --no-tailwind --eslint --src-dir --import-alias "@/*"
pnpm add @thesysai/genui-sdk @crayonai/react-ui reactflow
pnpm add x402-next x402-fetch viem
pnpm add @nightcrawler/contracts@workspace:*
```

## Responsibilities

1. Register the `ConspiracyBoard` custom component with the Thesys C1 GenUI SDK
   using `conspiracyBoardSchema` from `@nightcrawler/contracts`.
2. Call `POST /api/run`, then consume `GET /api/stream?runId=...` (SSE of
   `StreamEvent`). Start against `packages/contracts/fixtures/mock_events.ndjson`,
   swap to the live agent in Phase 2.
3. Implement the x402-gated `GET /api/alpha?runId=...` route returning
   `AlphaResponse` (Base Sepolia, see `X402_CONFIG`).
4. Fallback renderer: `reactflow` board drawing the same `Signal` nodes/edges.
