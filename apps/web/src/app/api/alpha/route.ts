import { NextRequest, NextResponse } from "next/server";
import { alphaResponseSchema } from "@nightcrawler/contracts";
import { agentAlphaUrl } from "@/lib/agentProxy";
import { isMockMode } from "@/lib/paths";
import { getSignal } from "@/lib/signalStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ error: "runId required" }, { status: 400 });
  }

  // In real mode, proxy alpha request to the agent service
  if (!isMockMode()) {
    const upstream = await fetch(agentAlphaUrl(runId));
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Agent alpha failed: ${upstream.status}` },
        { status: upstream.status }
      );
    }
    const json = await upstream.json();
    return NextResponse.json(alphaResponseSchema.parse(json));
  }

  // Mock mode — read from in-memory signal store (populated by runSession)
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
