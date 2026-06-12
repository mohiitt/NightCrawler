/**
 * guild.ts — Guild.ai REST API integration for the NIGHTCRAWLER approval gate.
 *
 * When the agent reaches the approval gate it POSTs a session to the
 * `nightcrawler-approval-gate` Guild agent (apps/agent/guild/nightcrawler-gate.ts).
 * A human reviewer sees the pending request in the Guild dashboard and clicks
 * Approve or Reject.  Simultaneously the local /api/approve endpoint remains
 * active, so the demo can be unblocked from either surface.
 *
 * Graceful degradation:
 *  - No GUILD_API_KEY → skip Guild entirely, rely on local /api/approve
 *  - Guild API unreachable at POST time → same fallback
 *  - Polling errors / timeout → auto-approve with warning (avoids hung runs)
 *
 * Guild REST API (discovered from @guildai/cli source):
 *   Base URL : https://app.guild.ai/api
 *   Auth     : Authorization: Bearer <GUILD_API_KEY>
 *   Create   : POST /workspaces/{workspaceId}/sessions
 *   Poll     : GET  /sessions/{sessionId}/events
 */

const GUILD_API_BASE = "https://app.guild.ai/api";
const POLL_INTERVAL_MS = 5_000;
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1_000; // 30 minutes

// ─── Internal helpers ────────────────────────────────────────────────────────

interface GuildSession {
  id: string;
  session_type: string;
}

interface GuildEvent {
  id: string;
  type?: string;
  event_type?: string;
  content?: unknown;
  task?: { root?: boolean };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function guildHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env["GUILD_API_KEY"]}`,
    "Content-Type": "application/json",
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Post a human-approval request to the Guild platform.
 *
 * Returns the Guild session ID on success, or `null` if Guild is
 * unavailable (caller falls back to local-only approval).
 */
export async function postApprovalRequest(
  runId: string,
  reason: string,
  signal: {
    thesis: string;
    confidence: number;
    tickers: string;
  },
): Promise<string | null> {
  const apiKey = process.env["GUILD_API_KEY"];
  if (!apiKey) {
    console.warn("[guild] GUILD_API_KEY not set — skipping Guild approval, waiting for local /api/approve");
    return null;
  }

  const orgId = process.env["GUILD_ORG_ID"] ?? "nightcrawler";
  // Workspace ID format: "owner~workspace-name". Override via GUILD_WORKSPACE_ID.
  const workspaceId = process.env["GUILD_WORKSPACE_ID"] ?? `${orgId}~default`;
  // Agent identifier format: "owner~agent-name" as deployed on Guild.
  const agentId = process.env["GUILD_AGENT_ID"] ?? `${orgId}~nightcrawler-approval-gate`;

  const prompt = [
    `NIGHTCRAWLER Run ID: ${runId}`,
    ``,
    `Reason: ${reason}`,
    ``,
    `Signal Summary:`,
    `  Thesis    : ${signal.thesis}`,
    `  Confidence: ${(signal.confidence * 100).toFixed(0)}%`,
    `  Trades    : ${signal.tickers}`,
    ``,
    `Langfuse trace: https://us.cloud.langfuse.com`,
    ``,
    `Do you approve publication of this intelligence signal? (Yes to publish, No to reject)`,
  ].join("\n");

  try {
    const res = await fetch(`${GUILD_API_BASE}/workspaces/${workspaceId}/sessions`, {
      method: "POST",
      headers: guildHeaders(),
      body: JSON.stringify({
        session_type: "chat",
        initial_prompt: prompt,
        agent_id: agentId,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[guild] Failed to create approval session (HTTP ${res.status}): ${text.slice(0, 200)}`);
      return null;
    }

    const session = (await res.json()) as GuildSession;
    console.log(`[guild] ✅ Guild approval session created: ${session.id}`);
    console.log(`[guild] 🔗 Review at: https://app.guild.ai`);
    return session.id;
  } catch (err) {
    console.warn(`[guild] Could not reach Guild API: ${(err as Error).message} — falling back to local approval`);
    return null;
  }
}

/**
 * Poll a Guild session until the human approves, rejects, or the timeout fires.
 *
 * Resolves (void) on approval or timeout-with-fallback.
 * Throws if the Guild reviewer explicitly rejected the signal.
 */
export async function pollGuildApproval(
  sessionId: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<void> {
  const apiKey = process.env["GUILD_API_KEY"];
  if (!apiKey) {
    console.warn("[guild] GUILD_API_KEY not set — auto-approving (Guild poll skipped)");
    return;
  }

  const deadline = Date.now() + timeoutMs;
  let lastEventId: string | undefined;
  let consecutiveErrors = 0;
  const MAX_ERRORS = 5;

  console.log(`[guild] ⏳ Polling Guild session ${sessionId} for human approval…`);

  while (Date.now() < deadline) {
    try {
      const urlParams = lastEventId ? `?after_id=${lastEventId}` : "";
      const res = await fetch(
        `${GUILD_API_BASE}/sessions/${sessionId}/events${urlParams}`,
        {
          headers: guildHeaders(),
          signal: AbortSignal.timeout(10_000),
        },
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as { events?: GuildEvent[] };
      const events = data.events ?? [];
      consecutiveErrors = 0;

      for (const event of events) {
        if (event.id) lastEventId = event.id;

        const evType = event.type ?? event.event_type ?? "";

        if (evType === "runtime_done") {
          const output = event.content as { approved?: boolean; reviewerNote?: string } | null | undefined;

          if (output && output.approved === false) {
            const note = output.reviewerNote ? ` (${output.reviewerNote})` : "";
            throw new Error(`Guild reviewer rejected the signal${note}`);
          }

          // approved === true or content missing → treat as approved
          console.log("[guild] ✅ Guild reviewer approved the signal!");
          return;
        }

        if (evType === "runtime_error") {
          console.warn("[guild] Guild session hit a runtime error — auto-approving as fallback");
          return;
        }
      }
    } catch (err) {
      const msg = (err as Error).message;

      // Explicit rejection from the Guild reviewer must propagate
      if (msg.startsWith("Guild reviewer rejected")) {
        throw err;
      }

      consecutiveErrors++;
      console.warn(`[guild] Poll error (${consecutiveErrors}/${MAX_ERRORS}): ${msg}`);

      if (consecutiveErrors >= MAX_ERRORS) {
        console.warn("[guild] Too many consecutive errors — auto-approving as fallback");
        return;
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }

  // Timeout reached — auto-approve so the run isn't permanently hung
  console.warn(
    `[guild] Guild approval timed out after ${timeoutMs / 60_000} min — auto-approving as fallback`,
  );
}
