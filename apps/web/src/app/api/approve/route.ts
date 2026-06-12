import { NextResponse } from "next/server";
import {
  approveRequestSchema,
  approveResponseSchema,
} from "@nightcrawler/contracts";
import { proxyApprove } from "@/lib/agentProxy";
import { isMockMode } from "@/lib/paths";
import { approveSession, getSession } from "@/lib/runSession";

export async function POST(request: Request) {
  try {
    const body = approveRequestSchema.parse(await request.json());

    if (!isMockMode()) {
      const response = await proxyApprove(body);
      return NextResponse.json(approveResponseSchema.parse(response));
    }

    if (!getSession(body.runId)) {
      return NextResponse.json({ error: "Unknown runId" }, { status: 404 });
    }

    if (!body.approved) {
      return NextResponse.json(
        approveResponseSchema.parse({ runId: body.runId, resumed: false })
      );
    }

    approveSession(body.runId);
    return NextResponse.json(
      approveResponseSchema.parse({ runId: body.runId, resumed: true })
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Approval failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
