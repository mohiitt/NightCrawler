import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  runRequestSchema,
  runResponseSchema,
} from "@nightcrawler/contracts";
import { proxyRun } from "@/lib/agentProxy";
import { isMockMode } from "@/lib/paths";
import { createRun } from "@/lib/runSession";

export async function POST(request: Request) {
  try {
    const body = runRequestSchema.parse(
      await request.json().catch(() => ({}))
    );

    if (!isMockMode()) {
      const response = await proxyRun(body);
      return NextResponse.json(runResponseSchema.parse(response));
    }

    const runId = `demo-${randomUUID().slice(0, 8)}`;
    createRun(runId);
    return NextResponse.json(runResponseSchema.parse({ runId }));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
