import { z } from "zod";

/**
 * The Signal contract is the canonical output of the NIGHTCRAWLER agent and the
 * boundary between Teammate B (agent) and Teammate C (UI / economy).
 *
 * FROZEN in Phase 0. Do not change field names/shapes without team sign-off,
 * because three tracks depend on this seam.
 */

export const conspiracyNodeKind = z.enum([
  "news",
  "flight",
  "filing",
  "market",
  "synthesis",
]);
export type ConspiracyNodeKind = z.infer<typeof conspiracyNodeKind>;

export const conspiracyNodeSchema = z.object({
  id: z.string(),
  kind: conspiracyNodeKind,
  label: z.string(),
  detail: z.string(),
  sourceUrl: z.union([z.string().url(), z.literal(""), z.null()]).nullish(),
  /** 0..1 model confidence for this individual evidence node. */
  confidence: z.number().min(0).max(1).optional(),
});
export type ConspiracyNode = z.infer<typeof conspiracyNodeSchema>;

export const conspiracyEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string(),
});
export type ConspiracyEdge = z.infer<typeof conspiracyEdgeSchema>;

export const citationSchema = z.object({
  source: z.string(),
  url: z.string(),
  quote: z.string(),
});
export type Citation = z.infer<typeof citationSchema>;

export const tickerDirection = z.enum(["LONG", "SHORT"]);
export type TickerDirection = z.infer<typeof tickerDirection>;

/**
 * The actual "alpha" payload that is sold behind the x402 / CDP paywall.
 * Never streamed in the clear before payment.
 */
export const alphaSchema = z.object({
  action: z.string(),
  tickers: z.array(
    z.object({
      ticker: z.string(),
      direction: tickerDirection,
    })
  ),
  rationale: z.string(),
});
export type Alpha = z.infer<typeof alphaSchema>;

export const signalSchema = z.object({
  thesis: z.string(),
  /** 0..1 aggregate confidence after corroboration. */
  confidence: z.number().min(0).max(1),
  nodes: z.array(conspiracyNodeSchema),
  edges: z.array(conspiracyEdgeSchema),
  citations: z.array(citationSchema),
  alpha: alphaSchema,
});
export type Signal = z.infer<typeof signalSchema>;

/** Public view of a Signal with the gated alpha stripped out. */
export const publicSignalSchema = signalSchema.omit({ alpha: true });
export type PublicSignal = z.infer<typeof publicSignalSchema>;

export function toPublicSignal(signal: Signal): PublicSignal {
  const { alpha: _alpha, ...rest } = signal;
  return rest;
}
