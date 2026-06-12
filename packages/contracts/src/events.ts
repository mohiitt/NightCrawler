import { z } from "zod";
import {
  conspiracyEdgeSchema,
  conspiracyNodeSchema,
  publicSignalSchema,
} from "./signal.js";

/**
 * SSE event contract streamed from the agent service (apps/agent) to the web UI
 * (apps/web) over GET /api/stream?runId=...
 *
 * Each event is one JSON object per SSE `data:` line. The `mock_events.ndjson`
 * fixture is a replayable sequence of these so Teammate C can build before the
 * real agent exists.
 *
 * Note: the `signal` event carries the PUBLIC signal (no alpha). The gated alpha
 * is only retrievable via the x402-protected GET /api/alpha route.
 */

export const statusEvent = z.object({
  type: z.literal("status"),
  payload: z.object({
    /** Short human-readable phase, e.g. "Detecting flight anomalies". */
    message: z.string(),
    /** Optional 0..1 progress hint. */
    progress: z.number().min(0).max(1).optional(),
  }),
});

export const nodeEvent = z.object({
  type: z.literal("node"),
  payload: conspiracyNodeSchema,
});

export const edgeEvent = z.object({
  type: z.literal("edge"),
  payload: conspiracyEdgeSchema,
});

export const approvalRequiredEvent = z.object({
  type: z.literal("approval_required"),
  payload: z.object({
    runId: z.string(),
    /** Why approval is needed (liability summary shown to the human). */
    reason: z.string(),
    /** Optional Guild.ai approval/session reference. */
    approvalRef: z.string().optional(),
  }),
});

export const signalEvent = z.object({
  type: z.literal("signal"),
  payload: publicSignalSchema,
});

export const doneEvent = z.object({
  type: z.literal("done"),
  payload: z.object({
    runId: z.string(),
    /** True once citations have been published to cited.md. */
    published: z.boolean(),
  }),
});

export const errorEvent = z.object({
  type: z.literal("error"),
  payload: z.object({
    message: z.string(),
    code: z.string().optional(),
  }),
});

export const streamEventSchema = z.discriminatedUnion("type", [
  statusEvent,
  nodeEvent,
  edgeEvent,
  approvalRequiredEvent,
  signalEvent,
  doneEvent,
  errorEvent,
]);
export type StreamEvent = z.infer<typeof streamEventSchema>;
export type StreamEventType = StreamEvent["type"];

/** Helper to serialize an event as a single SSE frame. */
export function toSseFrame(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
