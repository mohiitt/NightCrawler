/**
 * Teammate C (economy) entrypoint placeholder.
 *
 * Implement buyer_bot here:
 *   1. GET /api/alpha?runId=... -> receives HTTP 402 with x402 payment requirements.
 *   2. Sign + pay the USDC amount on Base Sepolia via an x402 client (x402-fetch /
 *      x402-axios) using BUYER_PRIVATE_KEY, then retry to unlock AlphaResponse.
 *   3. Print the unlocked alpha (SHORT NVDA / LONG INTC) to prove the A2A sale.
 *
 * Fallback: direct @coinbase/coinbase-sdk USDC transfer + manual unlock toggle.
 */
import { API_ROUTES, alphaResponseSchema, X402_CONFIG } from "@nightcrawler/contracts";

export const _route = API_ROUTES.alpha;
export const _x402 = X402_CONFIG;
export const _schema = alphaResponseSchema;
