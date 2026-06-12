/**
 * ping_db.ts — quick connectivity check before running seed.
 * Usage: pnpm --filter @nightcrawler/ingest ping
 */
import { getDb, resolveDriver } from "@nightcrawler/db";

async function main() {
  const driver = resolveDriver();
  console.log(`Driver: ${driver}`);
  if (driver === "clickhouse") {
    const url = process.env["CLICKHOUSE_URL"] ?? "(not set)";
    // Mask password in URL for display
    const display = url.replace(/:[^:@]+@/, ":***@");
    console.log(`ClickHouse URL: ${display}`);
    console.log("Pinging ClickHouse (may take up to 30s if instance is paused)...");
  }

  const t0 = Date.now();
  const db = await getDb();
  const alive = await db.ping();
  const ms = Date.now() - t0;

  if (alive) {
    console.log(`✓ Connected in ${ms}ms`);
    const rows = await db.query<{ result: number }>("SELECT 1 AS result");
    console.log(`✓ SELECT 1 =>`, rows[0]);
  } else {
    console.error(`✗ Ping failed after ${ms}ms`);
    process.exit(1);
  }
  await db.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
