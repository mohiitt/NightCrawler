/**
 * seed_db.ts — Teammate A
 *
 * Populates the NIGHTCRAWLER database with:
 *   • ~350 flight rows (noise + the Golden Path exec jets)
 *   • ~400 news/filing rows (noise + the Trump summit + Commerce Dept RFI)
 *   • ~250 market anomaly rows (noise + the NVDA put spike)
 *
 * Golden Path (what the agent must detect):
 *   ─ Flights today to PEK: Tim Cook (Apple), Pat Gelsinger (Intel)
 *   ─ Flight today: Jensen Huang (Nvidia) → stayed in SFO (the anomalous ABSENCE)
 *   ─ News: Trump lands in Beijing for General Trade Summit
 *   ─ Filing: US Commerce Dept RFI on advanced AI chip export controls
 *   ─ Market: NVDA put-volume spike, severity 9/10
 *
 * Usage:
 *   pnpm --filter @nightcrawler/ingest seed         # default SQLite
 *   DB_DRIVER=clickhouse pnpm --filter @nightcrawler/ingest seed
 *   RESET=true pnpm --filter @nightcrawler/ingest seed  # clear tables first
 */

import { faker } from "@faker-js/faker";
import { v4 as uuid } from "uuid";
import { getDb } from "@nightcrawler/db";
import type { FlightRow, NewsRow, MarketAnomalyRow } from "@nightcrawler/db";

// ─── Config ───────────────────────────────────────────────────────────────────

const NOISE_FLIGHTS = 345;
const NOISE_NEWS = 395;
const NOISE_MARKET = 245;

const NOW = new Date();
const TODAY = fmt(NOW);
const YESTERDAY = fmt(daysAgo(1));
const WEEK_AGO = fmt(daysAgo(7));

function fmt(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}
function daysAgo(n: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}
function hoursAgo(n: number): Date {
  const d = new Date(NOW);
  d.setHours(d.getHours() - n);
  return d;
}
function minutesAgo(n: number): Date {
  const d = new Date(NOW);
  d.setMinutes(d.getMinutes() - n);
  return d;
}

// ─── Airport / entity noise pools ─────────────────────────────────────────────

const AIRPORTS = [
  "JFK", "LAX", "SFO", "ORD", "DFW", "MIA", "LHR", "CDG", "AMS", "FRA",
  "DXB", "SIN", "HKG", "NRT", "ICN", "SYD", "GRU", "MEX", "EZE", "BOM",
  "DEL", "CGK", "KUL", "BKK", "IST", "ZRH", "VIE", "ARN", "OSL", "CPH",
];

const CORPS = [
  "Microsoft Corp", "Google LLC", "Meta Platforms", "Amazon.com Inc",
  "Tesla Inc", "Berkshire Hathaway", "JPMorgan Chase", "Goldman Sachs",
  "Softbank Group", "Samsung Electronics", "TSMC", "ASML Holding",
  "Qualcomm Inc", "Broadcom Inc", "Arm Holdings", "AMD Inc",
  "Lockheed Martin", "Raytheon Technologies", "Boeing Co", "General Dynamics",
];

const TECH_TICKERS = [
  "MSFT", "GOOGL", "META", "AMZN", "TSLA", "AAPL", "INTC", "AMD",
  "QCOM", "AVGO", "AMAT", "LRCX", "KLAC", "MRVL", "ON", "SWKS",
];

const ANOMALY_TYPES = [
  "put_volume_spike", "call_volume_spike", "short_interest_surge",
  "insider_selling", "unusual_options_flow", "dark_pool_print",
  "block_trade", "vix_correlation", "gamma_squeeze",
];

const NEWS_SOURCES = [
  "Reuters", "Bloomberg", "Wall Street Journal", "Financial Times",
  "Associated Press", "Nikkei Asia", "South China Morning Post",
  "The Economist", "CNBC", "MarketWatch",
];

// ─── Noise generators ─────────────────────────────────────────────────────────

function makeFlight(): FlightRow {
  const dest = faker.helpers.arrayElement(AIRPORTS);
  const owner = faker.helpers.arrayElement(CORPS);
  const tail = `N${faker.number.int({ min: 100, max: 999 })}${faker.string.alpha({ length: 2, casing: "upper" })}`;
  const ts = faker.date.between({ from: daysAgo(30), to: hoursAgo(2) });
  return { id: uuid(), tail_number: tail, owner_entity: owner, destination: dest, timestamp: fmt(ts) };
}

function makeNews(): NewsRow {
  const source = faker.helpers.arrayElement(NEWS_SOURCES);
  const topic = faker.helpers.arrayElement([
    "Federal Reserve raises rates", "Earnings season begins", "IPO pricing",
    "Trade tensions escalate", "Supply chain disruption", "Merger announced",
    "Regulatory filing submitted", "Patent dispute filed", "CEO departure",
    "Quarterly guidance raised", "Acquisition premium paid", "Bond auction results",
    "Currency fluctuation", "Commodity price movement", "Antitrust inquiry",
  ]);
  const ts = faker.date.between({ from: daysAgo(30), to: hoursAgo(3) });
  return {
    id: uuid(),
    source,
    headline: `${topic} — ${faker.company.name()}`,
    content: faker.lorem.paragraphs(2),
    url: `https://example.com/news/${faker.string.alphanumeric(10)}`,
    timestamp: fmt(ts),
  };
}

function makeMarketAnomaly(): MarketAnomalyRow {
  const ticker = faker.helpers.arrayElement(TECH_TICKERS);
  const anomalyType = faker.helpers.arrayElement(ANOMALY_TYPES);
  const severity = faker.number.int({ min: 1, max: 6 }); // noise is low-severity
  const ts = faker.date.between({ from: daysAgo(30), to: hoursAgo(3) });
  return { id: uuid(), ticker, anomaly_type: anomalyType, severity, timestamp: fmt(ts) };
}

// ─── Golden Path (the actual anomalies the agent must find) ───────────────────

const GOLDEN_FLIGHTS: FlightRow[] = [
  {
    id: "gp-flight-cook",
    tail_number: "N2759A",
    owner_entity: "Apple Inc",
    destination: "PEK",
    timestamp: fmt(hoursAgo(4)),
  },
  {
    id: "gp-flight-gelsinger",
    tail_number: "N100EX",
    owner_entity: "Intel Corp",
    destination: "PEK",
    timestamp: fmt(hoursAgo(5)),
  },
  {
    // Jensen Huang's jet went to SFO (stayed in California — the ABSENCE anomaly)
    id: "gp-flight-huang",
    tail_number: "N888JH",
    owner_entity: "Nvidia Corp",
    destination: "SFO",
    timestamp: fmt(hoursAgo(6)),
  },
];

const GOLDEN_NEWS: NewsRow[] = [
  {
    id: "gp-news-summit",
    source: "Associated Press",
    headline: "President Trump lands in Beijing for General Trade Summit",
    content:
      "President Donald Trump arrived in Beijing today for the high-stakes General Trade " +
      "Summit. The visit is expected to produce a framework agreement on technology and " +
      "semiconductor trade, with multiple US tech CEOs accompanying the delegation.",
    url: "https://example.com/news/trump-beijing-summit",
    timestamp: fmt(hoursAgo(8)),
  },
  {
    id: "gp-filing-rfi",
    source: "US Dept of Commerce",
    headline:
      "Request For Information: Export Controls on Advanced AI Accelerators and Semiconductor Chips",
    content:
      "The Bureau of Industry and Security (BIS) requests public comment on proposed " +
      "expansion of export control restrictions covering advanced AI accelerator chips, " +
      "specifically those exceeding 4800 TOPS compute capability. Comments due within 30 days.",
    url: "https://example.com/filings/bis-rfi-ai-export",
    timestamp: fmt(hoursAgo(48)),
  },
];

const GOLDEN_MARKET: MarketAnomalyRow[] = [
  {
    id: "gp-market-nvda-puts",
    ticker: "NVDA",
    anomaly_type: "put_volume_spike",
    severity: 9, // High-severity stands out vs. noise max of 6
    timestamp: fmt(minutesAgo(90)),
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const reset = process.env["RESET"] === "true";
  const db = await getDb();
  console.log(`Using DB driver: ${db.driver}`);

  if (reset) {
    console.log("Resetting tables...");
    await db.reset();
  }

  // ── Flights ──
  console.log(`Inserting ${NOISE_FLIGHTS} noise flights + ${GOLDEN_FLIGHTS.length} golden...`);
  const flights: FlightRow[] = [
    ...Array.from({ length: NOISE_FLIGHTS }, makeFlight),
    ...GOLDEN_FLIGHTS,
  ];
  await db.insertBatch("flights", flights);
  console.log(`  ✓ ${flights.length} flights`);

  // ── News & Filings ──
  console.log(`Inserting ${NOISE_NEWS} noise news + ${GOLDEN_NEWS.length} golden...`);
  const news: NewsRow[] = [
    ...Array.from({ length: NOISE_NEWS }, makeNews),
    ...GOLDEN_NEWS,
  ];
  await db.insertBatch("news_and_filings", news);
  console.log(`  ✓ ${news.length} news/filings`);

  // ── Market Anomalies ──
  console.log(
    `Inserting ${NOISE_MARKET} noise anomalies + ${GOLDEN_MARKET.length} golden...`,
  );
  const market: MarketAnomalyRow[] = [
    ...Array.from({ length: NOISE_MARKET }, makeMarketAnomaly),
    ...GOLDEN_MARKET,
  ];
  await db.insertBatch("market_anomalies", market);
  console.log(`  ✓ ${market.length} market anomalies`);

  const total = flights.length + news.length + market.length;
  console.log(`\nSeed complete: ${total} total rows.`);
  console.log(`Golden Path rows: ${GOLDEN_FLIGHTS.length + GOLDEN_NEWS.length + GOLDEN_MARKET.length} (IDs prefixed "gp-")`);

  await db.close();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
