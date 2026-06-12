import { z } from "zod";
import { conspiracyEdgeSchema, conspiracyNodeSchema } from "./signal.js";

/**
 * Props contract for the custom <ConspiracyBoard> component rendered via the
 * Thesys C1 / OpenUI Lang stream.
 *
 * One schema, two consumers:
 *  - Teammate B registers/instructs the C1 API with this schema so the model
 *    emits a ConspiracyBoard component.
 *  - Teammate C registers the same schema in the GenUI SDK to render it.
 *
 * Mirrors the node/edge shape from the Signal contract so the board renders the
 * exact evidence graph the agent produced.
 */
export const conspiracyBoardSchema = z.object({
  title: z.string().default("NIGHTCRAWLER Conspiracy Board"),
  thesis: z.string(),
  confidence: z.number().min(0).max(1),
  nodes: z.array(conspiracyNodeSchema),
  edges: z.array(conspiracyEdgeSchema),
});
export type ConspiracyBoardProps = z.infer<typeof conspiracyBoardSchema>;

/** Stable component name used in OpenUI Lang registration. */
export const CONSPIRACY_BOARD_COMPONENT = "ConspiracyBoard" as const;
