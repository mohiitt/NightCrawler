/**
 * Canonical table schema for NIGHTCRAWLER. Owned by Teammate A, consumed by
 * Teammate B's execute_sql tool. Kept dialect-neutral where possible; the
 * ClickHouse and SQLite create statements differ only in column types.
 */

export const TABLES = ["flights", "news_and_filings", "market_anomalies"] as const;
export type TableName = (typeof TABLES)[number];

export interface FlightRow extends Record<string, unknown> {
  id: string;
  tail_number: string;
  owner_entity: string;
  destination: string;
  timestamp: string;
}

export interface NewsRow extends Record<string, unknown> {
  id: string;
  source: string;
  headline: string;
  content: string;
  url: string;
  timestamp: string;
}

export interface MarketAnomalyRow extends Record<string, unknown> {
  id: string;
  ticker: string;
  anomaly_type: string;
  severity: number;
  timestamp: string;
}

export const CLICKHOUSE_SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS flights (
  id String,
  tail_number String,
  owner_entity String,
  destination String,
  timestamp DateTime
) ENGINE = MergeTree ORDER BY timestamp;

CREATE TABLE IF NOT EXISTS news_and_filings (
  id String,
  source String,
  headline String,
  content String,
  url String,
  timestamp DateTime
) ENGINE = MergeTree ORDER BY timestamp;

CREATE TABLE IF NOT EXISTS market_anomalies (
  id String,
  ticker String,
  anomaly_type String,
  severity Int32,
  timestamp DateTime
) ENGINE = MergeTree ORDER BY timestamp;
`;

export const SQLITE_SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS flights (
  id TEXT PRIMARY KEY,
  tail_number TEXT,
  owner_entity TEXT,
  destination TEXT,
  timestamp TEXT
);

CREATE TABLE IF NOT EXISTS news_and_filings (
  id TEXT PRIMARY KEY,
  source TEXT,
  headline TEXT,
  content TEXT,
  url TEXT,
  timestamp TEXT
);

CREATE TABLE IF NOT EXISTS market_anomalies (
  id TEXT PRIMARY KEY,
  ticker TEXT,
  anomaly_type TEXT,
  severity INTEGER,
  timestamp TEXT
);
`;
