/**
 * DB access contract for NIGHTCRAWLER.
 *
 * Shared seam between Teammate A (data/ingest) and Teammate B (agent's
 * execute_sql tool). Either ClickHouse Cloud or SQLite depending on env.
 *
 * DB_DRIVER selection:
 *   "clickhouse" | "sqlite" explicit, OR auto: ClickHouse if CLICKHOUSE_URL set.
 */
import { CLICKHOUSE_SCHEMA, SQLITE_SCHEMA } from "./schema.js";

export * from "./schema.js";

export type DbDriver = "clickhouse" | "sqlite";

export interface DbClient {
  driver: DbDriver;
  /** Run a SELECT / SHOW query and return rows as plain objects. */
  query<T = Record<string, unknown>>(sql: string): Promise<T[]>;
  /** Run a DDL or DML statement (no result set expected). */
  exec(sql: string): Promise<void>;
  /**
   * Bulk-insert rows into a table. Much faster than repeated exec() calls.
   * Rows must match the target table's column set (extra keys are ignored).
   */
  insertBatch<T extends Record<string, unknown>>(table: string, rows: T[]): Promise<void>;
  /** Create tables if they don't exist. Called automatically by getDb(). */
  init(): Promise<void>;
  /** DELETE all rows from all tables. Useful for seeding/testing. */
  reset(): Promise<void>;
  close(): Promise<void>;
}

let singleton: DbClient | null = null;

export function resolveDriver(): DbDriver {
  const raw = (process.env["DB_DRIVER"] ?? "").toLowerCase();
  if (raw === "clickhouse" || raw === "sqlite") return raw;
  return process.env["CLICKHOUSE_URL"] ? "clickhouse" : "sqlite";
}

/**
 * Returns the singleton DbClient, initialising it on first call.
 * Pass force=true to throw away the existing singleton (e.g. after changing env).
 */
export async function getDb(force = false): Promise<DbClient> {
  if (singleton && !force) return singleton;
  if (singleton) {
    await singleton.close();
    singleton = null;
  }
  const driver = resolveDriver();
  singleton = driver === "clickhouse" ? await createClickHouse() : await createSqlite();
  await singleton.init();
  return singleton;
}

/** Convenience wrapper: `import { query } from "@nightcrawler/db"`. */
export async function query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const db = await getDb();
  return db.query<T>(sql);
}

// ─── ClickHouse ──────────────────────────────────────────────────────────────

async function createClickHouse(): Promise<DbClient> {
  const { createClient } = await import("@clickhouse/client");

  const url = process.env["CLICKHOUSE_URL"];
  if (!url) throw new Error("CLICKHOUSE_URL is required when DB_DRIVER=clickhouse");

  const client = createClient({
    url,
    username: process.env["CLICKHOUSE_USER"] ?? "default",
    password: process.env["CLICKHOUSE_PASSWORD"] ?? "",
    clickhouse_settings: { wait_for_async_insert: 1 },
  });

  async function runStatement(sql: string) {
    const trimmed = sql.trim();
    if (trimmed) await client.command({ query: trimmed });
  }

  return {
    driver: "clickhouse",

    async init() {
      // Split on semicolons that end a statement block (lines ending with ;)
      const stmts = CLICKHOUSE_SCHEMA.split(/;\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const stmt of stmts) {
        await runStatement(stmt);
      }
    },

    async query<T>(sql: string) {
      const rs = await client.query({ query: sql, format: "JSONEachRow" });
      return (await rs.json()) as T[];
    },

    async exec(sql: string) {
      await runStatement(sql);
    },

    async insertBatch<T extends Record<string, unknown>>(table: string, rows: T[]) {
      if (rows.length === 0) return;
      await client.insert({ table, values: rows, format: "JSONEachRow" });
    },

    async reset() {
      for (const t of ["flights", "news_and_filings", "market_anomalies"]) {
        await runStatement(`TRUNCATE TABLE IF EXISTS ${t}`);
      }
    },

    async close() {
      await client.close();
    },
  };
}

// ─── SQLite ───────────────────────────────────────────────────────────────────

async function createSqlite(): Promise<DbClient> {
  const mod = await import("better-sqlite3");
  const Database = (mod as unknown as { default: SqliteConstructor }).default;
  const dbPath = process.env["SQLITE_PATH"] ?? "nightcrawler.sqlite";
  const db = new Database(dbPath);
  // WAL mode for better concurrent-read performance during demos.
  db.pragma("journal_mode = WAL");

  function buildInsert<T extends Record<string, unknown>>(table: string, rows: T[]): void {
    if (rows.length === 0) return;
    const keys = Object.keys(rows[0]!);
    const placeholders = keys.map(() => "?").join(", ");
    const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;
    const stmt = db.prepare(sql);
    const insertMany = db.transaction((rws: T[]) => {
      for (const row of rws) stmt.run(...keys.map((k) => row[k]));
    });
    insertMany(rows);
  }

  return {
    driver: "sqlite",

    async init() {
      // exec handles multiple statements separated by semicolons.
      db.exec(SQLITE_SCHEMA);
    },

    async query<T>(sql: string) {
      return db.prepare(sql).all() as T[];
    },

    async exec(sql: string) {
      db.exec(sql);
    },

    async insertBatch<T extends Record<string, unknown>>(table: string, rows: T[]) {
      buildInsert(table, rows);
    },

    async reset() {
      db.exec("DELETE FROM flights; DELETE FROM news_and_filings; DELETE FROM market_anomalies;");
    },

    async close() {
      db.close();
    },
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SqliteConstructor = new (path: string) => SqliteDb;
interface SqliteDb {
  pragma(str: string): unknown;
  exec(sql: string): unknown;
  prepare(sql: string): { run(...args: unknown[]): unknown; all(): unknown[] };
  transaction<T>(fn: (arg: T[]) => void): (arg: T[]) => void;
  close(): void;
}
