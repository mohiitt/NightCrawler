/**
 * Teammate A entrypoint placeholder.
 *
 * Implement seed_db here:
 *   1. getDb() and init() the schema from @nightcrawler/db.
 *   2. Insert ~1000 rows of plausible noise across all three tables.
 *   3. Insert the Golden Path anomaly so the agent can find it:
 *        - flights: Tim Cook + Pat Gelsinger -> Beijing (today); Jensen Huang -> stays California.
 *        - news_and_filings: "Trump lands in Beijing" headline + an obscure US Commerce Dept AI-chip RFI.
 *        - market_anomalies: NVDA put-volume spike (severity high).
 *   4. Optionally wire an Airbyte Faker/File source -> ClickHouse for the demo "sync" moment.
 *
 * Keep the Golden Path values aligned with packages/contracts/fixtures/mock_signal.json.
 */
import { getDb, TABLES } from "@nightcrawler/db";

export const _tables = TABLES;
export const _getDb = getDb;
