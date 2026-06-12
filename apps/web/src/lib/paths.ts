import path from "path";

/** Monorepo root (NightCrawler/) from apps/web cwd. */
export const REPO_ROOT = path.resolve(process.cwd(), "../..");

export const FIXTURES_DIR = path.join(
  REPO_ROOT,
  "packages/contracts/fixtures"
);

export const MOCK_EVENTS_PATH = path.join(FIXTURES_DIR, "mock_events.ndjson");
export const MOCK_SIGNAL_PATH = path.join(FIXTURES_DIR, "mock_signal.json");

export function isMockMode(): boolean {
  return process.env.MOCK_STREAM !== "false";
}

export function agentServiceUrl(): string {
  return process.env.AGENT_SERVICE_URL ?? "http://localhost:8787";
}
