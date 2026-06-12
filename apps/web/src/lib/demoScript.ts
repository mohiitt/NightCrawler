/** Demo narrative constants — UI only; does not change frozen contracts. */

export const DEMO_TRADE = {
  headline: "Agent's Trade",
  tickers: [
    { ticker: "NVDA", direction: "SHORT" as const },
    { ticker: "AMD", direction: "SHORT" as const },
    { ticker: "INTC", direction: "LONG" as const },
  ],
  thesis:
    "Geopolitical Alpha: an unannounced semiconductor export ban is being negotiated.",
};

export const SPONSORS = [
  "Airbyte",
  "ClickHouse",
  "OpenUI",
  "Guild.ai",
  "Langfuse",
  "Composio",
  "Coinbase CDP",
] as const;

export const AIRBYTE_SYNC_STEPS = [
  "Connecting Airbyte Context Store…",
  "Syncing FAA executive flight logs…",
  "Syncing SEC & Commerce filings…",
  "Syncing options tape → ClickHouse…",
  "Ingest complete — agent querying OLAP…",
] as const;
