/**
 * Teammate B entrypoint placeholder.
 *
 * Build the run/stream service here. It must:
 *   1. Expose POST /api/run, GET /api/stream, POST /api/approve (see contracts/api).
 *   2. Run the Guild.ai agent with an `execute_sql` tool over @nightcrawler/db.
 *   3. Detect the flight anomaly, then run secondary corroboration queries.
 *   4. Emit StreamEvent frames (status/node/edge/approval_required/signal/done).
 *   5. Trace LLM + SQL via Langfuse; pause on the Guild approval gate; on
 *      approval, publish citations to cited.md via Composio.
 *
 * Validate every emitted Signal with signalSchema before sending it.
 */
import { signalSchema, type StreamEvent } from "@nightcrawler/contracts";

export const _contractsWired: typeof signalSchema = signalSchema;
export type _Event = StreamEvent;
