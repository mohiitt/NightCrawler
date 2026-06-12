/**
 * server.ts — NIGHTCRAWLER agent run/stream service.
 *
 * Routes:
 *   POST /api/run     → { runId }  — start a corroboration run
 *   GET  /api/stream  → SSE        — live StreamEvent frames for a run
 *   POST /api/approve → { resumed } — unblock the approval gate
 *   GET  /api/alpha   → AlphaResponse — gated alpha (Teammate C wraps with x402)
 *   GET  /health      → { ok }
 */
import "./tracing.js"; // MUST be first — initialises Langfuse OTEL

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { v4 as uuid } from "uuid";

import { toSseFrame, type ApproveRequest } from "@nightcrawler/contracts";
import { createRun, getRun, pushEvent } from "./store.js";
import { runAgent } from "./agent.js";

const app = new Hono();
app.use("*", cors({ origin: "*" }));

const PORT = Number(process.env["PORT"] ?? 8787);

// ── Health ───────────────────────────────────────────────────────────────────

app.get("/health", (c) => c.json({ ok: true, service: "nightcrawler-agent", port: PORT }));

// ── POST /api/run ────────────────────────────────────────────────────────────

app.post("/api/run", async (c) => {
  const runId = uuid();
  const run = createRun(runId);

  // Fire-and-forget — errors are caught and pushed as error events
  runAgent(run).catch((err: Error) => {
    console.error(`[server] Run ${runId} crashed:`, err);
    pushEvent(run, { type: "error", payload: { message: err.message, code: "AGENT_CRASH" } });
    run.status = "error";
  });

  console.log(`[server] Started run ${runId}`);
  return c.json({ runId });
});

// ── GET /api/stream ──────────────────────────────────────────────────────────

app.get("/api/stream", (c) => {
  const runId = c.req.query("runId");
  if (!runId) return c.json({ error: "runId required" }, 400);

  const run = getRun(runId);
  if (!run) return c.json({ error: "run not found" }, 404);

  return c.body(
    new ReadableStream({
      start(controller) {
        // Replay all past events (handles late-connecting clients)
        for (const ev of run.events) {
          controller.enqueue(new TextEncoder().encode(toSseFrame(ev)));
        }

        // Stream is already done
        if (run.status === "done" || run.status === "error") {
          controller.close();
          return;
        }

        // Register as a live client
        const send = (ev: typeof run.events[number]) => {
          try {
            controller.enqueue(new TextEncoder().encode(toSseFrame(ev)));
            if (ev.type === "done" || ev.type === "error") {
              run.clients.delete(send);
              controller.close();
            }
          } catch {
            run.clients.delete(send);
          }
        };
        run.clients.add(send);
      },
      cancel() {
        // client disconnected — will be cleaned up on next send attempt
      },
    }),
    200,
    {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  );
});

// ── POST /api/approve ────────────────────────────────────────────────────────

app.post("/api/approve", async (c) => {
  const body = (await c.req.json()) as ApproveRequest;
  const run = getRun(body.runId);
  if (!run) return c.json({ error: "run not found" }, 404);
  if (run.status !== "awaiting_approval") {
    return c.json({ error: `Run is ${run.status}, not awaiting_approval` }, 409);
  }

  if (body.approved === false) {
    run.approvalReject(new Error("Human rejected the signal"));
    return c.json({ runId: body.runId, resumed: false });
  }

  run.approvalResolve();
  console.log(`[server] ✅ Run ${body.runId} approved.`);
  return c.json({ runId: body.runId, resumed: true });
});

// ── GET /api/alpha ───────────────────────────────────────────────────────────
// Returns raw alpha (no x402 here). Teammate C's Next.js wraps this with x402.

app.get("/api/alpha", (c) => {
  const runId = c.req.query("runId");
  if (!runId) return c.json({ error: "runId required" }, 400);

  const run = getRun(runId);
  if (!run) return c.json({ error: "run not found" }, 404);
  if (!run.signal) return c.json({ error: "Signal not yet synthesized" }, 202);

  return c.json({ runId, alpha: run.signal.alpha });
});

// ── Start ────────────────────────────────────────────────────────────────────

console.log(`\n🕷  NIGHTCRAWLER agent service starting on port ${PORT}`);
console.log(`   POST http://localhost:${PORT}/api/run`);
console.log(`   GET  http://localhost:${PORT}/api/stream?runId=<id>`);
console.log(`   POST http://localhost:${PORT}/api/approve`);
console.log(`   GET  http://localhost:${PORT}/api/alpha?runId=<id>`);

serve({ fetch: app.fetch, port: PORT });
