/**
 * verify_db.ts — Teammate A
 *
 * Runs the exact queries the agent's execute_sql tool will issue and prints
 * results to prove the Golden Path data is queryable.
 *
 * Usage:
 *   pnpm --filter @nightcrawler/ingest verify
 *   DB_DRIVER=clickhouse pnpm --filter @nightcrawler/ingest verify
 */

import { query } from "@nightcrawler/db";
import type { FlightRow, NewsRow, MarketAnomalyRow } from "@nightcrawler/db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function section(title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

function printTable(rows: unknown[]) {
  if (rows.length === 0) {
    console.log("  (no rows)");
    return;
  }
  console.table(rows);
}

// ─── Queries ─────────────────────────────────────────────────────────────────

async function run() {
  section("1 · ALL FLIGHTS TO BEIJING (PEK) — the anomaly detection query");
  const beijing = await query<FlightRow>(
    `SELECT id, tail_number, owner_entity, destination, timestamp
     FROM flights
     WHERE destination = 'PEK'
     ORDER BY timestamp DESC`,
  );
  printTable(beijing);
  console.log(`Found ${beijing.length} flight(s) to PEK`);

  section("2 · NVIDIA JET LOCATION — confirming Jensen Huang stayed home");
  const nvdaJet = await query<FlightRow>(
    `SELECT id, tail_number, owner_entity, destination, timestamp
     FROM flights
     WHERE owner_entity = 'Nvidia Corp'
     ORDER BY timestamp DESC`,
  );
  printTable(nvdaJet);

  section("3 · TECH CEO FLIGHTS TODAY vs. PEK — cross-reference");
  const ceoFlights = await query<FlightRow>(
    `SELECT owner_entity, destination, tail_number, timestamp
     FROM flights
     WHERE owner_entity IN ('Apple Inc','Intel Corp','Nvidia Corp')
     ORDER BY timestamp DESC`,
  );
  printTable(ceoFlights);

  section("4 · COMMERCE DEPT FILINGS (RFI query)");
  const filings = await query<NewsRow>(
    `SELECT id, source, headline, timestamp
     FROM news_and_filings
     WHERE source = 'US Dept of Commerce'
     ORDER BY timestamp DESC`,
  );
  printTable(filings);

  section("5 · NEWS ABOUT TRUMP OR BEIJING");
  const summitNews = await query<NewsRow>(
    `SELECT id, source, headline, timestamp
     FROM news_and_filings
     WHERE headline LIKE '%Beijing%' OR headline LIKE '%Trump%'
     ORDER BY timestamp DESC`,
  );
  printTable(summitNews);

  section("6 · HIGH-SEVERITY MARKET ANOMALIES (severity >= 7)");
  const highSeverity = await query<MarketAnomalyRow>(
    `SELECT id, ticker, anomaly_type, severity, timestamp
     FROM market_anomalies
     WHERE severity >= 7
     ORDER BY severity DESC, timestamp DESC`,
  );
  printTable(highSeverity);
  console.log(`Found ${highSeverity.length} high-severity anomalie(s)`);

  section("7 · NVDA-SPECIFIC ANOMALIES — corroboration query");
  const nvdaAnomalies = await query<MarketAnomalyRow>(
    `SELECT id, ticker, anomaly_type, severity, timestamp
     FROM market_anomalies
     WHERE ticker = 'NVDA'
     ORDER BY severity DESC, timestamp DESC`,
  );
  printTable(nvdaAnomalies);

  section("8 · TABLE ROW COUNTS");
  const [fc] = await query<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM flights`);
  const [nc] = await query<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM news_and_filings`);
  const [mc] = await query<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM market_anomalies`);
  console.log(`  flights:          ${fc?.cnt ?? "?"}`);
  console.log(`  news_and_filings: ${nc?.cnt ?? "?"}`);
  console.log(`  market_anomalies: ${mc?.cnt ?? "?"}`);
  console.log(`  total:            ${(Number(fc?.cnt ?? 0) + Number(nc?.cnt ?? 0) + Number(mc?.cnt ?? 0))}`);

  console.log("\n✓ All verification queries completed.");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
