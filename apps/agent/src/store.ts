/**
 * store.ts — In-memory run state.
 * Each run has an event queue, a set of live SSE clients, and an approval gate.
 */
import type { Signal, StreamEvent } from "@nightcrawler/contracts";

export interface Run {
  id: string;
  status: "running" | "awaiting_approval" | "done" | "error";
  events: StreamEvent[];
  signal?: Signal;
  /** Live SSE client callbacks — receive each new event as it's emitted. */
  clients: Set<(ev: StreamEvent) => void>;
  /** Resolves when POST /api/approve is called (approved=true). */
  approvalPromise: Promise<void>;
  approvalResolve: () => void;
  approvalReject: (err: Error) => void;
}

const runs = new Map<string, Run>();

export function createRun(id: string): Run {
  let resolveApproval!: () => void;
  let rejectApproval!: (err: Error) => void;
  const approvalPromise = new Promise<void>((res, rej) => {
    resolveApproval = res;
    rejectApproval = rej;
  });

  const run: Run = {
    id,
    status: "running",
    events: [],
    clients: new Set(),
    approvalPromise,
    approvalResolve: resolveApproval,
    approvalReject: rejectApproval,
  };
  runs.set(id, run);
  return run;
}

export function getRun(id: string): Run | undefined {
  return runs.get(id);
}

/** Push an event to the run's queue and broadcast to all live SSE clients. */
export function pushEvent(run: Run, event: StreamEvent): void {
  run.events.push(event);
  for (const cb of run.clients) {
    try { cb(event); } catch { /* client disconnected */ }
  }
}
