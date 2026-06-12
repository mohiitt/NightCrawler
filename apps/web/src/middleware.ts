import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALPHA_PRICE = "$0.05";
const TESTNET_FACILITATOR = "https://x402.org/facilitator";

const sellerAddress = process.env.SELLER_ADDRESS as `0x${string}` | undefined;
const facilitatorUrl =
  process.env.X402_FACILITATOR_URL ?? TESTNET_FACILITATOR;

async function passthrough() {
  return NextResponse.next();
}

async function buildPaywallMiddleware() {
  if (!sellerAddress) {
    return passthrough;
  }

  const { paymentMiddleware } = await import("x402-next");
  return paymentMiddleware(
    sellerAddress,
    {
      "/api/alpha": {
        price: ALPHA_PRICE,
        network: "base-sepolia",
        config: {
          description: "NIGHTCRAWLER alpha payload — gated market intelligence",
          mimeType: "application/json",
        },
      },
    },
    { url: facilitatorUrl as `${string}://${string}` }
  );
}

const middlewarePromise = buildPaywallMiddleware();

export async function middleware(request: NextRequest) {
  const handler = await middlewarePromise;
  return handler(request);
}

export const config = {
  matcher: ["/api/alpha"],
};
