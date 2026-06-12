import { NextRequest } from "next/server";
import { toSseFrame } from "@nightcrawler/contracts";
import { agentStreamUrl } from "@/lib/agentProxy";
import { isMockMode } from "@/lib/paths";
import { ensureSession, streamSessionEvents } from "@/lib/runSession";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  if (!runId) {
    return new Response("runId query parameter required", { status: 400 });
  }

  if (!isMockMode()) {
    const upstream = await fetch(agentStreamUrl(runId), {
      headers: { Accept: "text/event-stream" },
    });
    if (!upstream.ok || !upstream.body) {
      return new Response("Failed to connect to agent stream", {
        status: 502,
      });
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  ensureSession(runId);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamSessionEvents(runId)) {
          controller.enqueue(encoder.encode(toSseFrame(event)));
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Stream error";
        controller.enqueue(
          encoder.encode(
            toSseFrame({
              type: "error",
              payload: { message },
            })
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
