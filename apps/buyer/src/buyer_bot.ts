/**
 * NIGHTCRAWLER mock buyer agent — auto-pays the x402 paywall on GET /api/alpha
 * and prints the unlocked alpha payload.
 *
 * Usage:
 *   WEB_URL=http://localhost:3000 RUN_ID=demo-run-001 pnpm buy
 *
 * Requires BUYER_PRIVATE_KEY + SELLER_ADDRESS (Base Sepolia, funded with testnet USDC).
 * viem direct USDC transfer fallback when x402-fetch payment fails.
 */
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { AlphaResponse } from "@nightcrawler/contracts";
import { alphaResponseSchema, X402_CONFIG } from "@nightcrawler/contracts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

/** Base Sepolia USDC (Circle testnet). */
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

function loadEnv(key: string): string | undefined {
  return process.env[key];
}

async function fetchAlphaWithX402(
  url: string,
  privateKey: `0x${string}`
): Promise<AlphaResponse> {
  const { privateKeyToAccount } = await import("viem/accounts");
  const { wrapFetchWithPayment } = await import("x402-fetch");

  const account = privateKeyToAccount(privateKey);
  const fetchWithPayment = wrapFetchWithPayment(fetch, account);

  const res = await fetchWithPayment(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`x402 fetch failed: ${res.status} ${await res.text()}`);
  }
  return alphaResponseSchema.parse(await res.json());
}

async function directUsdcTransferFallback(
  privateKey: `0x${string}`,
  sellerAddress: `0x${string}`
): Promise<void> {
  const { createWalletClient, http, parseUnits } = await import("viem");
  const { baseSepolia } = await import("viem/chains");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { erc20Abi } = await import("viem");

  const account = privateKeyToAccount(privateKey);
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  const amount = parseUnits("0.05", 6);
  const hash = await client.writeContract({
    address: BASE_SEPOLIA_USDC,
    abi: erc20Abi,
    functionName: "transfer",
    args: [sellerAddress, amount],
  });
  console.log("[buyer] Direct USDC transfer tx:", hash);
}

async function main() {
  const webUrl = loadEnv("WEB_URL") ?? "http://localhost:3000";
  let runId = loadEnv("RUN_ID");

  if (!runId) {
    const mockSignalPath = path.join(
      REPO_ROOT,
      "packages/contracts/fixtures/mock_events.ndjson"
    );
    const lines = readFileSync(mockSignalPath, "utf-8").trim().split("\n");
    const approvalLine = lines.find((l) => l.includes("approval_required"));
    if (approvalLine) {
      const parsed = JSON.parse(approvalLine) as {
        payload?: { runId?: string };
      };
      runId = parsed.payload?.runId;
    }
  }

  if (!runId) {
    throw new Error("Set RUN_ID or start a web run first");
  }

  const alphaUrl = `${webUrl}/api/alpha?runId=${encodeURIComponent(runId)}`;
  console.log(`[buyer] Target: ${alphaUrl}`);
  console.log(
    `[buyer] Facilitator: ${loadEnv("X402_FACILITATOR_URL") ?? X402_CONFIG.testnetFacilitator}`
  );

  const privateKey = loadEnv("BUYER_PRIVATE_KEY") as `0x${string}` | undefined;
  const sellerAddress = loadEnv("SELLER_ADDRESS") as `0x${string}` | undefined;

  if (!privateKey) {
    console.log(
      "[buyer] No BUYER_PRIVATE_KEY — attempting unauthenticated fetch (dev mode)"
    );
    const res = await fetch(alphaUrl);
    if (res.status === 402) {
      console.error(
        "[buyer] 402 Payment Required. Set BUYER_PRIVATE_KEY + SELLER_ADDRESS."
      );
      process.exit(1);
    }
    const body = alphaResponseSchema.parse(await res.json());
    console.log(JSON.stringify(body, null, 2));
    return;
  }

  try {
    const body = await fetchAlphaWithX402(alphaUrl, privateKey);
    console.log("[buyer] Alpha unlocked via x402:");
    console.log(JSON.stringify(body, null, 2));
  } catch (x402Error) {
    console.warn("[buyer] x402 payment failed:", x402Error);
    if (sellerAddress) {
      console.log("[buyer] Attempting direct USDC transfer fallback…");
      await directUsdcTransferFallback(privateKey, sellerAddress);
      const retry = await fetchAlphaWithX402(alphaUrl, privateKey);
      console.log("[buyer] Alpha unlocked after direct transfer:");
      console.log(JSON.stringify(retry, null, 2));
    } else {
      throw x402Error;
    }
  }
}

main().catch((err) => {
  console.error("[buyer] Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
