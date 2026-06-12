/**
 * agent.ts — NIGHTCRAWLER corroboration loop.
 *
 * Uses an OpenAI tool-use loop (wrapped with Langfuse via observeOpenAI) to:
 *  1. Query flight data → detect CEO jet anomaly (who went to Beijing, who didn't)
 *  2. Autonomously spawn two corroboration queries (Commerce Dept RFI + NVDA options)
 *  3. Synthesize a high-confidence Signal when 3+ vectors converge
 *  4. Pause at the Guild.ai approval gate
 *  5. After approval: publish citations → emit done event
 *
 * Every LLM call and SQL query is traced in Langfuse automatically.
 */
import "./tracing.js"; // MUST be first
import OpenAI from "openai";
import { observeOpenAI } from "@langfuse/openai";
import { v4 as uuid } from "uuid";
import { query } from "@nightcrawler/db";
import {
  signalSchema,
  toPublicSignal,
  type ConspiracyNode,
  type ConspiracyEdge,
} from "@nightcrawler/contracts";
import { type Run, pushEvent } from "./store.js";
import { publishCitations } from "./publisher.js";

const openai = observeOpenAI(
  new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] }),
  { sessionId: "nightcrawler", tags: ["osint", "corroboration"] },
);

// ─── System prompt ────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

const SYSTEM_PROMPT = `You are NIGHTCRAWLER — an autonomous OSINT intelligence broker.

Your mission: Detect hidden geopolitical signals by running rigorous multi-vector corroboration across flight logs, government filings, and market data. Never jump to conclusions. Every hypothesis must be independently validated by at least 2 additional data vectors.

## Database Context
Tables (already populated with today's intelligence data):
  flights(id, tail_number, owner_entity, destination, timestamp)
  news_and_filings(id, source, headline, content, url, timestamp)
  market_anomalies(id, ticker, anomaly_type, severity, timestamp)

Known AI chip company executive aircraft tracked in this dataset:
  - Apple Inc (CEO: Tim Cook)
  - Intel Corp (CEO: Pat Gelsinger)
  - Nvidia Corp (CEO: Jensen Huang)

Today's date: ${TODAY}

## Corroboration Protocol (execute in this exact order)

### PHASE 1 — Flight Anomaly Detection
Step 1a: emit_status("Scanning flight logs for executive jets", 0.1)
Step 1b: execute_sql — query ALL flights to PEK destination (no entity filter):
  SELECT tail_number, owner_entity, destination, timestamp FROM flights WHERE destination = 'PEK' ORDER BY timestamp DESC
Step 1c: execute_sql — check where Nvidia Corp jet went (the absence hypothesis):
  SELECT tail_number, owner_entity, destination, timestamp FROM flights WHERE owner_entity = 'Nvidia Corp' ORDER BY timestamp DESC LIMIT 5
Step 1d: Also check news for Trump or Beijing context:
  SELECT source, headline, url, timestamp FROM news_and_filings WHERE headline LIKE '%Beijing%' OR headline LIKE '%Trump%' ORDER BY timestamp DESC LIMIT 5
For each anomaly found, call emit_node() with the appropriate kind.

### PHASE 2 — Autonomous Corroboration (REQUIRED after flight anomaly)
Step 2a: emit_status("Flight anomaly confirmed — running corroboration queries", 0.45)
Step 2b: execute_sql — check for Commerce Dept or export control filings:
  SELECT source, headline, url, timestamp FROM news_and_filings WHERE source LIKE '%Commerce%' OR headline LIKE '%export%' OR headline LIKE '%chip%' ORDER BY timestamp DESC LIMIT 10
Step 2c: execute_sql — check for high-severity NVDA market anomalies:
  SELECT ticker, anomaly_type, severity, timestamp FROM market_anomalies WHERE ticker = 'NVDA' AND severity >= 7 ORDER BY severity DESC LIMIT 5
For each corroborating item, call emit_node() with kind="filing" or "market".

### PHASE 3 — Synthesis
Step 3a: emit_status("Three vectors converged — synthesizing signal", 0.75)
Step 3b: emit_node() for the synthesis node (kind="synthesis")
Step 3c: emit_edge() connecting all evidence nodes TO the synthesis node
Step 3d: synthesize_signal() with thesis, confidence, citations from the URLs found, and alpha

## Rules
- Always complete ALL steps — do not stop early
- Even if individual query returns 0 rows, run all queries before drawing conclusions
- Confidence = 0.86 if all 3 vectors (flight, filing, market) converge
- Alpha: if evidence supports AI chip export ban → SHORT NVDA, LONG INTC
- sourceUrl in emit_node should use the url field from the DB row`;

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "execute_sql",
      description: "Execute a read-only SQL query against the intelligence database. Returns JSON rows.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The SQL SELECT query to run." },
          rationale: { type: "string", description: "Why you are running this query (logged in trace)." },
        },
        required: ["query", "rationale"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "emit_status",
      description: "Send a status update to the conspiracy board stream.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string" },
          progress: { type: "number", description: "0 to 1" },
        },
        required: ["message", "progress"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "emit_node",
      description: "Add an evidence node to the conspiracy board.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          kind: { type: "string", enum: ["news", "flight", "filing", "market", "synthesis"] },
          label: { type: "string" },
          detail: { type: "string" },
          sourceUrl: { type: "string" },
          confidence: { type: "number", description: "0 to 1" },
        },
        required: ["id", "kind", "label", "detail"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "emit_edge",
      description: "Connect two nodes on the conspiracy board.",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string" },
          target: { type: "string" },
          label: { type: "string" },
        },
        required: ["source", "target", "label"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "synthesize_signal",
      description: "Emit the final synthesized intelligence signal after corroboration is complete.",
      parameters: {
        type: "object",
        properties: {
          thesis: { type: "string", description: "1-2 sentence intelligence thesis." },
          confidence: { type: "number", description: "Aggregate confidence 0-1." },
          citations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                source: { type: "string" },
                url: { type: "string" },
                quote: { type: "string" },
              },
              required: ["source", "url", "quote"],
            },
          },
          alpha: {
            type: "object",
            properties: {
              action: { type: "string" },
              tickers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    ticker: { type: "string" },
                    direction: { type: "string", enum: ["LONG", "SHORT"] },
                  },
                  required: ["ticker", "direction"],
                },
              },
              rationale: { type: "string" },
            },
            required: ["action", "tickers", "rationale"],
          },
        },
        required: ["thesis", "confidence", "citations", "alpha"],
      },
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────

interface ToolResult {
  done: boolean;
  synthesized?: ReturnType<typeof signalSchema.parse>;
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  run: Run,
  nodes: ConspiracyNode[],
  edges: ConspiracyEdge[],
): Promise<{ output: string; result: ToolResult }> {
  switch (name) {
    case "execute_sql": {
      const sql = args["query"] as string;
      const rationale = args["rationale"] as string;
      console.log(`  [SQL] ${rationale}\n  > ${sql.trim().slice(0, 120)}`);
      try {
        const rows = await query(sql);
        const output = JSON.stringify(rows, null, 2);
        console.log(`  [SQL] → ${rows.length} row(s)`);
        return { output, result: { done: false } };
      } catch (err) {
        const msg = `SQL error: ${(err as Error).message}`;
        console.error(`  [SQL] Error:`, msg);
        return { output: msg, result: { done: false } };
      }
    }

    case "emit_status": {
      pushEvent(run, {
        type: "status",
        payload: { message: args["message"] as string, progress: args["progress"] as number },
      });
      return { output: "status emitted", result: { done: false } };
    }

    case "emit_node": {
      const node: ConspiracyNode = {
        id: args["id"] as string,
        kind: args["kind"] as ConspiracyNode["kind"],
        label: args["label"] as string,
        detail: args["detail"] as string,
        sourceUrl: args["sourceUrl"] as string | undefined,
        confidence: args["confidence"] as number | undefined,
      };
      nodes.push(node);
      pushEvent(run, { type: "node", payload: node });
      return { output: "node emitted", result: { done: false } };
    }

    case "emit_edge": {
      const edge: ConspiracyEdge = {
        id: uuid(),
        source: args["source"] as string,
        target: args["target"] as string,
        label: args["label"] as string,
      };
      edges.push(edge);
      pushEvent(run, { type: "edge", payload: edge });
      return { output: "edge emitted", result: { done: false } };
    }

    case "synthesize_signal": {
      const rawSignal = {
        thesis: args["thesis"] as string,
        confidence: args["confidence"] as number,
        nodes,
        edges,
        citations: args["citations"] as Array<{ source: string; url: string; quote: string }>,
        alpha: args["alpha"] as { action: string; tickers: Array<{ ticker: string; direction: "LONG" | "SHORT" }>; rationale: string },
      };
      const signal = signalSchema.parse(rawSignal);
      return { output: "signal synthesized", result: { done: true, synthesized: signal } };
    }

    default:
      return { output: `Unknown tool: ${name}`, result: { done: false } };
  }
}

// ─── Main agent loop ──────────────────────────────────────────────────────────

export async function runAgent(run: Run): Promise<void> {
  console.log(`\n[agent] Starting run ${run.id}`);
  const nodes: ConspiracyNode[] = [];
  const edges: ConspiracyEdge[] = [];
  let synthesizedSignal: ReturnType<typeof signalSchema.parse> | undefined;

  pushEvent(run, { type: "status", payload: { message: "NIGHTCRAWLER agent initialising", progress: 0.02 } });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: "Today is " + new Date().toISOString().slice(0, 10) +
        ". Begin the NIGHTCRAWLER corroboration protocol. Start with PHASE 1: scan flight logs for executive jet anomalies.",
    },
  ];

  // Tool-use loop — max 25 iterations to prevent runaway
  for (let iter = 0; iter < 25; iter++) {
    const response = await (openai as OpenAI).chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    });

    const msg = response.choices[0]?.message;
    if (!msg) break;

    messages.push(msg);

    // No more tool calls
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      if (!synthesizedSignal && iter < 22) {
        // Agent stopped early — nudge it back to Phase 3
        console.log("[agent] Agent paused without synthesizing — nudging to complete Phase 3.");
        messages.push({
          role: "user",
          content:
            "You have not yet called synthesize_signal. The corroboration protocol is incomplete. " +
            "Proceed immediately to Phase 3: emit_status, emit the synthesis node, emit_edge for every evidence node → synthesis node, then call synthesize_signal.",
        });
        continue;
      }
      console.log("[agent] Agent finished. Content:", msg.content?.slice(0, 200));
      break;
    }

    // Execute all tool calls in this turn
    const toolResults: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] = [];
    for (const tc of msg.tool_calls) {
      const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      const { output, result } = await executeTool(tc.function.name, args, run, nodes, edges);

      toolResults.push({
        role: "tool",
        tool_call_id: tc.id,
        content: output,
      });

      if (result.done && result.synthesized) {
        synthesizedSignal = result.synthesized;
      }
    }

    messages.push(...toolResults);

    if (synthesizedSignal) break;
  }

  if (!synthesizedSignal) {
    pushEvent(run, { type: "error", payload: { message: "Agent did not synthesize a signal", code: "NO_SIGNAL" } });
    run.status = "error";
    return;
  }

  // Store signal and emit the public view (no alpha)
  run.signal = synthesizedSignal;
  pushEvent(run, { type: "signal", payload: toPublicSignal(synthesizedSignal) });

  // ── Guild approval gate ──────────────────────────────────────────────────
  run.status = "awaiting_approval";
  const approvalRef = `guild-${run.id.slice(0, 8)}`;
  pushEvent(run, {
    type: "approval_required",
    payload: {
      runId: run.id,
      reason: `NIGHTCRAWLER intends to publish market-moving intelligence (confidence: ${(synthesizedSignal.confidence * 100).toFixed(0)}%). Verify Langfuse trace confirms no hallucination and Mosaic Theory compliance.`,
      approvalRef,
    },
  });

  console.log(`[agent] ⏸  Awaiting approval. Call POST /api/approve { runId: "${run.id}" } to continue.`);
  console.log(`[agent] 🔍 Langfuse: https://cloud.langfuse.com`);

  await run.approvalPromise;
  console.log("[agent] ✅ Approved. Publishing citations...");

  // ── Publish to cited.md via Composio ────────────────────────────────────
  await publishCitations(synthesizedSignal, run.id);

  // ── Done ─────────────────────────────────────────────────────────────────
  run.status = "done";
  pushEvent(run, { type: "done", payload: { runId: run.id, published: true } });
  console.log(`[agent] ✓ Run ${run.id} complete.`);
}
