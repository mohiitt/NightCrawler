import {
  CONSPIRACY_BOARD_COMPONENT,
  conspiracyBoardSchema,
} from "@nightcrawler/contracts";

/**
 * JSON Schema for ConspiracyBoard custom component registration with Thesys C1.
 * Teammate B passes this in C1 API metadata; Teammate C registers the React
 * component under the same name via customizeC1.customComponents.
 */
export const CONSPIRACY_BOARD_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", default: "NIGHTCRAWLER Conspiracy Board" },
    thesis: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    nodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          kind: {
            type: "string",
            enum: ["news", "flight", "filing", "market", "synthesis"],
          },
          label: { type: "string" },
          detail: { type: "string" },
          sourceUrl: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["id", "kind", "label", "detail"],
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          source: { type: "string" },
          target: { type: "string" },
          label: { type: "string" },
        },
        required: ["id", "source", "target", "label"],
      },
    },
  },
  required: ["thesis", "confidence", "nodes", "edges"],
} as const;

export const C1_CUSTOM_COMPONENT_SCHEMAS = {
  [CONSPIRACY_BOARD_COMPONENT]: CONSPIRACY_BOARD_JSON_SCHEMA,
} as const;

/** Validate board props before handing to either C1 or react-flow fallback. */
export function parseBoardProps(input: unknown) {
  return conspiracyBoardSchema.parse(input);
}

export function useC1Renderer(): boolean {
  return (
    process.env.NEXT_PUBLIC_USE_C1 === "true" &&
    Boolean(process.env.NEXT_PUBLIC_THESYS_C1_ENABLED ?? process.env.THESYS_C1_API_KEY)
  );
}
