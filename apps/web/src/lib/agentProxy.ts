import type {
  ApproveRequest,
  ApproveResponse,
  RunRequest,
  RunResponse,
} from "@nightcrawler/contracts";
import { agentServiceUrl } from "./paths";

export async function proxyRun(body: RunRequest): Promise<RunResponse> {
  const res = await fetch(`${agentServiceUrl()}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Agent /run failed: ${res.status}`);
  }
  return res.json() as Promise<RunResponse>;
}

export async function proxyApprove(
  body: ApproveRequest
): Promise<ApproveResponse> {
  const res = await fetch(`${agentServiceUrl()}/api/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Agent /approve failed: ${res.status}`);
  }
  return res.json() as Promise<ApproveResponse>;
}

export function agentStreamUrl(runId: string): string {
  return `${agentServiceUrl()}/api/stream?runId=${encodeURIComponent(runId)}`;
}

export function agentAlphaUrl(runId: string): string {
  return `${agentServiceUrl()}/api/alpha?runId=${encodeURIComponent(runId)}`;
}
