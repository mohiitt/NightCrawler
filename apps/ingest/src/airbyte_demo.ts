/**
 * airbyte_demo.ts — Nightcrawler Airbyte ETL Integration
 *
 * Makes REAL Airbyte Cloud API calls when AIRBYTE_API_KEY is set.
 * Falls back gracefully when the key is absent (seeded ClickHouse data
 * already in place for the demo).
 *
 * Pipeline demonstrated:
 *   Faker Source → Airbyte Connection → E2E-Test Destination
 *   (In production: Open Data Sources → ClickHouse Cloud)
 *
 * Environment:
 *   AIRBYTE_API_KEY  — Airbyte Cloud personal access token
 *                      (Settings → Developer → API Keys)
 *
 * Usage:
 *   pnpm --filter @nightcrawler/ingest airbyte
 */

const BASE = "https://api.airbyte.com/v1";

const SOURCE_NAME      = "Nightcrawler Faker Source";
const DESTINATION_NAME = "Nightcrawler E2E Destination";
const CONNECTION_NAME  = "Nightcrawler Demo Connection";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AirbyteItem {
  [key: string]: unknown;
}

interface ListResponse {
  data: AirbyteItem[];
  next?: string;
}

interface Source {
  sourceId: string;
  name: string;
  workspaceId: string;
}

interface Destination {
  destinationId: string;
  name: string;
  workspaceId: string;
}

interface Connection {
  connectionId: string;
  name: string;
  status: string;
}

interface Job {
  jobId: number | string;
  status: string;
  jobType: string;
  startTime?: string;
}

// ─── Core request helper ───────────────────────────────────────────────────────

async function airbyteRequest<T>(
  method: string,
  path: string,
  apiKey: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`Airbyte API ${method} ${path} → ${res.status}: ${text}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Step 1: Resolve workspace ─────────────────────────────────────────────────

async function getWorkspaceId(apiKey: string): Promise<string> {
  console.log("[airbyte] Fetching workspaces…");
  const result = await airbyteRequest<ListResponse>("GET", "/workspaces", apiKey);
  const workspaces = result.data ?? [];

  if (workspaces.length === 0) {
    throw new Error("No Airbyte workspaces found. Create one at cloud.airbyte.com first.");
  }

  const ws = workspaces[0]!;
  console.log(`[airbyte] Using workspace: "${ws["name"] as string}" (${ws["workspaceId"] as string})`);
  return ws["workspaceId"] as string;
}

// ─── Step 2: Source (Faker) ────────────────────────────────────────────────────

async function getOrCreateSource(apiKey: string, workspaceId: string): Promise<string> {
  console.log("[airbyte] Checking for existing Faker source…");

  const result = await airbyteRequest<ListResponse>(
    "GET",
    `/sources?workspaceId=${workspaceId}&limit=100`,
    apiKey,
  );

  const existing = (result.data ?? []).find(
    (s) => (s["name"] as string) === SOURCE_NAME,
  ) as Source | undefined;

  if (existing) {
    console.log(`[airbyte] Reusing source: "${existing.name}" (${existing.sourceId})`);
    return existing.sourceId;
  }

  console.log("[airbyte] Creating Faker source…");
  const created = await airbyteRequest<Source>("POST", "/sources", apiKey, {
    workspaceId,
    name: SOURCE_NAME,
    configuration: {
      sourceType: "faker",
      count: 1000,
      seed: 42,
      always_updated: false,
    },
  });

  console.log(`[airbyte] Source created: "${created.name}" (${created.sourceId})`);
  return created.sourceId;
}

// ─── Step 3: Destination (E2E Test) ───────────────────────────────────────────

async function getOrCreateDestination(apiKey: string, workspaceId: string): Promise<string> {
  console.log("[airbyte] Checking for existing destination…");

  const result = await airbyteRequest<ListResponse>(
    "GET",
    `/destinations?workspaceId=${workspaceId}&limit=100`,
    apiKey,
  );

  const existing = (result.data ?? []).find(
    (d) => (d["name"] as string) === DESTINATION_NAME,
  ) as Destination | undefined;

  if (existing) {
    console.log(`[airbyte] Reusing destination: "${existing.name}" (${existing.destinationId})`);
    return existing.destinationId;
  }

  // Fallback: use any available destination in the workspace
  const any = result.data[0] as Destination | undefined;
  if (any) {
    console.log(`[airbyte] Using existing destination: "${any.name}" (${any.destinationId})`);
    return any.destinationId;
  }

  console.log("[airbyte] Creating E2E test destination…");
  const created = await airbyteRequest<Destination>("POST", "/destinations", apiKey, {
    workspaceId,
    name: DESTINATION_NAME,
    configuration: {
      destinationType: "e2e-test-destination",
      test_destination: {
        test_destination_type: "LOGGING",
        logging_config: {
          logging_type: "FirstNEntries",
          max_entry_count: 1000,
        },
      },
    },
  });

  console.log(`[airbyte] Destination created: "${created.name}" (${created.destinationId})`);
  return created.destinationId;
}

// ─── Step 4: Connection ────────────────────────────────────────────────────────

async function getOrCreateConnection(
  apiKey: string,
  workspaceId: string,
  sourceId: string,
  destinationId: string,
): Promise<string> {
  console.log("[airbyte] Checking for existing connection…");

  const result = await airbyteRequest<ListResponse>(
    "GET",
    `/connections?workspaceId=${workspaceId}&limit=100`,
    apiKey,
  );

  const existing = (result.data ?? []).find(
    (c) => (c["name"] as string) === CONNECTION_NAME,
  ) as Connection | undefined;

  if (existing) {
    console.log(`[airbyte] Reusing connection: "${existing.name}" (${existing.connectionId})`);
    return existing.connectionId;
  }

  console.log("[airbyte] Creating connection…");
  const created = await airbyteRequest<Connection>("POST", "/connections", apiKey, {
    name: CONNECTION_NAME,
    sourceId,
    destinationId,
    schedule: { scheduleType: "manual" },
    status: "active",
  });

  console.log(`[airbyte] Connection created: "${created.name}" (${created.connectionId})`);
  return created.connectionId;
}

// ─── Step 5: Trigger sync job ──────────────────────────────────────────────────

async function triggerSync(apiKey: string, connectionId: string): Promise<string | number> {
  console.log("[airbyte] Triggering sync job…");
  const job = await airbyteRequest<Job>("POST", "/jobs", apiKey, {
    connectionId,
    jobType: "sync",
  });
  console.log(`[airbyte] Job started: id=${job.jobId} status=${job.status}`);
  return job.jobId;
}

// ─── Step 6: Poll until done ──────────────────────────────────────────────────

const TERMINAL_STATUSES = new Set(["succeeded", "failed", "cancelled", "incomplete"]);
const POLL_INTERVAL_MS  = 5_000;
const POLL_TIMEOUT_MS   = 5 * 60 * 1_000; // 5 minutes

async function pollJob(apiKey: string, jobId: string | number): Promise<void> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let ticks = 0;

  console.log("\n[airbyte] Polling job status (5-min timeout)…");

  while (Date.now() < deadline) {
    const job = await airbyteRequest<Job>("GET", `/jobs/${jobId}`, apiKey);
    ticks++;

    const elapsed = `${(ticks * POLL_INTERVAL_MS) / 1000}s`;
    process.stdout.write(`  [${elapsed}] job=${job.jobId} status=${job.status}\n`);

    if (TERMINAL_STATUSES.has(job.status)) {
      if (job.status === "succeeded") {
        console.log(`\n✓ Airbyte sync SUCCEEDED (job ${job.jobId})\n`);
      } else {
        console.error(`\n✗ Airbyte sync ended with status: ${job.status}\n`);
        process.exitCode = 1;
      }
      return;
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.warn(`\n⚠  Polling timed out after ${POLL_TIMEOUT_MS / 60_000} min.`);
  console.warn("   Check https://cloud.airbyte.com for job status.\n");
}

// ─── Banner ────────────────────────────────────────────────────────────────────

function printBanner() {
  console.log("\n┌─────────────────────────────────────────────────────┐");
  console.log("│  NIGHTCRAWLER  ✦  Airbyte Cloud ETL Demo            │");
  console.log("│                                                     │");
  console.log("│  Faker Source → Airbyte Connection → E2E Dest       │");
  console.log("│  (Production: Open Data APIs → ClickHouse Cloud)    │");
  console.log("└─────────────────────────────────────────────────────┘\n");
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  printBanner();

  const apiKey = process.env["AIRBYTE_API_KEY"]?.trim() ?? "";

  if (!apiKey) {
    console.log("ℹ  AIRBYTE_API_KEY is not set.\n");
    console.log("   The seeded ClickHouse data is already available for the demo.");
    console.log("   To run the live Airbyte ETL pipeline:");
    console.log("   1. Sign in at https://cloud.airbyte.com");
    console.log("   2. Go to Settings → Developer → API Keys → New key");
    console.log("   3. Add AIRBYTE_API_KEY=<your-key> to .env");
    console.log("   4. Re-run: pnpm --filter @nightcrawler/ingest airbyte\n");
    process.exit(0);
  }

  console.log("[airbyte] API key detected — connecting to Airbyte Cloud…\n");

  try {
    // 1. Resolve workspace
    const workspaceId = await getWorkspaceId(apiKey);

    // 2. Ensure Faker source exists
    const sourceId = await getOrCreateSource(apiKey, workspaceId);

    // 3. Ensure destination exists
    const destinationId = await getOrCreateDestination(apiKey, workspaceId);

    // 4. Ensure connection exists
    const connectionId = await getOrCreateConnection(
      apiKey,
      workspaceId,
      sourceId,
      destinationId,
    );

    // 5. Trigger sync
    const jobId = await triggerSync(apiKey, connectionId);

    // 6. Poll to completion
    await pollJob(apiKey, jobId);

    console.log("[airbyte] Pipeline run complete.");
    console.log("[airbyte] ClickHouse already holds seeded data for the demo.\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("\n✗ Airbyte integration error:", msg);

    if (msg.includes("403") || msg.includes("401")) {
      console.error(
        "\n  → Check your AIRBYTE_API_KEY is valid and has workspace-level permissions.",
      );
    } else if (msg.includes("404")) {
      console.error(
        "\n  → Resource not found. Verify your workspace exists at cloud.airbyte.com.",
      );
    }

    process.exit(1);
  }
}

main();
