import { z } from "zod";
import { alphaSchema } from "./signal.js";

/**
 * HTTP API contract between the web UI (apps/web), the agent service
 * (apps/agent), and the buyer bot (apps/buyer).
 *
 * Routes (FROZEN):
 *   POST /api/run                -> RunResponse           (start a run)
 *   GET  /api/stream?runId=...   -> SSE of StreamEvent     (live progress)
 *   POST /api/approve            -> ApproveResponse        (resume after gate)
 *   GET  /api/alpha?runId=...    -> x402-gated AlphaResponse (the paid payload)
 */

export const API_ROUTES = {
  run: "/api/run",
  stream: "/api/stream",
  approve: "/api/approve",
  alpha: "/api/alpha",
} as const;

export const runRequestSchema = z.object({
  /** Optional scenario selector; defaults to the Trump/China demo. */
  scenario: z.string().optional(),
});
export type RunRequest = z.infer<typeof runRequestSchema>;

export const runResponseSchema = z.object({
  runId: z.string(),
});
export type RunResponse = z.infer<typeof runResponseSchema>;

export const approveRequestSchema = z.object({
  runId: z.string(),
  approved: z.boolean(),
  /** Optional Guild.ai approval reference echoed back. */
  approvalRef: z.string().optional(),
});
export type ApproveRequest = z.infer<typeof approveRequestSchema>;

export const approveResponseSchema = z.object({
  runId: z.string(),
  resumed: z.boolean(),
});
export type ApproveResponse = z.infer<typeof approveResponseSchema>;

/** Body returned by the x402-protected alpha route once payment settles. */
export const alphaResponseSchema = z.object({
  runId: z.string(),
  alpha: alphaSchema,
});
export type AlphaResponse = z.infer<typeof alphaResponseSchema>;

/** x402 paywall parameters for GET /api/alpha (Base Sepolia / CAIP-2). */
export const X402_CONFIG = {
  network: "eip155:84532",
  price: "$0.05",
  testnetFacilitator: "https://x402.org/facilitator",
  cdpFacilitator: "https://api.cdp.coinbase.com/platform/v2/x402",
} as const;
