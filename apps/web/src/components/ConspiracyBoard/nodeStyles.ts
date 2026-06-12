import type { ConspiracyNodeKind } from "@nightcrawler/contracts";

export const NODE_KIND_COLORS: Record<ConspiracyNodeKind, string> = {
  news: "#4a9eff",
  flight: "#f5a623",
  filing: "#b388ff",
  market: "#3dd68c",
  synthesis: "#ff5c7a",
};

export const NODE_KIND_LABELS: Record<ConspiracyNodeKind, string> = {
  news: "NEWS",
  flight: "FLIGHT",
  filing: "FILING",
  market: "MARKET",
  synthesis: "SYNTHESIS",
};
