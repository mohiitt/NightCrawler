import { NextRequest, NextResponse } from "next/server";
import { alphaResponseSchema } from "@nightcrawler/contracts";
import { getSignal } from "@/lib/signalStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ error: "runId required" }, { status: 400 });
  }

  const signal = getSignal(runId);
  if (!signal) {
    return NextResponse.json(
      { error: "Signal not found for runId" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    alphaResponseSchema.parse({ runId, alpha: signal.alpha })
  );
}
