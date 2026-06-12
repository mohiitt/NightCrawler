/**
 * DB access contract for NIGHTCRAWLER.
 *
 * The single seam shared by Teammate A (data) and Teammate B (agent). Both the
 * agent's `execute_sql` tool and the seed scripts go through `query()`.
 *
 * Driver is selected by env `DB_DRIVER` ("clickhouse" | "sqlite"). The same
 * SQL-ish read queries should work against either for the demo dataset, so the
 * agent code never needs to know which backend is live.
 *
 * Phase 0 ships the interface + a lazy driver loader. Teammate A hardens the
 * implementations (connection pooling, retries) in Phase 1.
 */
import { CLICKHOUSE_SCHEMA, SQLITE_SCHEMA } from "./schema.js";

export * from "./schema.js";

export type DbDriver = "clickhouse" | "sqlite";

export interface DbClient {
  driver: DbDriver;
  query<T = Record<string, unknown>>(sql: string): Promise<T[]>;
  exec(sql: string): Promise<void>;
  init(): Promise<void>;
  close(): Promise<void>;
}

let singleton: DbClient | null = null;

export function resolveDriver(): DbDriver {
  const raw = (process.env.DB_DRIVER ?? "").toLowerCase();
  if (raw === "clickhouse" || raw === "sqlite") return raw;
  // Default to ClickHouse when a URL is present, else fall back to SQLite.
  return process.env.CLICKHOUSE_URL ? "clickhouse" : "sqlite";
}

export async function getDb(): Promise<DbClient> {
  if (singleton) return singleton;
  const driver = resolveDriver();
  singleton = driver === "clickhouse" ? await createClickHouse() : await createSqlite();
  await singleton.init();
  return singleton;
}

/** Convenience wrapper so callers can `import { query } from "@nightcrawler/db"`. */
export async function query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const db = await getDb();
  return db.query<T>(sql);
}

async function createClickHouse(): Promise<DbClient> {
  const { createClient } = await import("@clickhouse/client");
  const client = createClient({
    url: process.env.CLICKHOUSE_URL,
    username: process.env.CLICKHOUSE_USER ?? "default",
    password: process.env.CLICKHOUSE_PASSWORD ?? "",
  });
  return {
    driver: "clickhouse",
    async init() {
      for (const stmt of CLICKHOUSE_SCHEMA.split(";")) {
        const trimmed = stmt.trim();
        if (trimmed) await client.command({ query: trimmed });
      }
    },
    async query<T>(sql: string) {
      const rs = await client.query({ query: sql, format: "JSONEachRow" });
      return (await rs.json()) as T[];
    },
    async exec(sql: string) {
      await client.command({ query: sql });
    },
    async close() {
      await client.close();
    },
  };
}

async function createSqlite(): Promise<DbClient> {
  // better-sqlite3 is an optional peer dep; only required for the local fallback.
  const mod = (await import("better-sqlite3")) as unknown as {
    default: new (path: string) => SqliteDb;
  };
  const Database = mod.default;
  const path = process.env.SQLITE_PATH ?? "nightcrawler.sqlite";
  const db = new Database(path);
  return {
    driver: "sqlite",
    async init() {
      db.exec(SQLITE_SCHEMA);
    },
    async query<T>(sql: string) {
      return db.prepare(sql).all() as T[];
    },
    async exec(sql: string) {
      db.exec(sql);
    },
    async close() {
      db.close();
    },
  };
}

interface SqliteDb {
  exec(sql: string): unknown;
  prepare(sql: string): { all(...params: unknown[]): unknown[] };
  close(): void;
}
