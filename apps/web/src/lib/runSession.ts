import { readFileSync } from "fs";
import type { Signal, StreamEvent } from "@nightcrawler/contracts";
import { streamEventSchema } from "@nightcrawler/contracts";
import { MOCK_EVENTS_PATH, MOCK_SIGNAL_PATH } from "./paths";
import { setSignal } from "./signalStore";

export type RunSession = {
  runId: string;
  events: StreamEvent[];
  cursor: number;
  approved: boolean;
  approvalWaiters: Array<() => void>;
};

const sessions = new Map<string, RunSession>();

function loadMockEvents(runId: string): StreamEvent[] {
  const raw = readFileSync(MOCK_EVENTS_PATH, "utf-8");
  return raw
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean)
    .map((line: string) => {
      const parsed = JSON.parse(line) as StreamEvent;
      if (parsed.type === "approval_required") {
        return {
          ...parsed,
          payload: { ...parsed.payload, runId },
        };
      }
      if (parsed.type === "done") {
        return {
          ...parsed,
          payload: { ...parsed.payload, runId },
        };
      }
      return parsed;
    })
    .map((event: StreamEvent) => streamEventSchema.parse(event));
}

function loadMockSignal(): Signal {
  const raw = readFileSync(MOCK_SIGNAL_PATH, "utf-8");
  return JSON.parse(raw) as Signal;
}

export function createRun(runId: string): RunSession {
  const events = loadMockEvents(runId);
  const signal = loadMockSignal();
  setSignal(runId, signal);

  const session: RunSession = {
    runId,
    events,
    cursor: 0,
    approved: false,
    approvalWaiters: [],
  };
  sessions.set(runId, session);
  return session;
}

export function getSession(runId: string): RunSession | undefined {
  return sessions.get(runId);
}

export function ensureSession(runId: string): RunSession {
  const existing = sessions.get(runId);
  if (existing) return existing;
  return createRun(runId);
}

export function approveSession(runId: string): boolean {
  const session = sessions.get(runId);
  if (!session) return false;
  session.approved = true;
  for (const resume of session.approvalWaiters.splice(0)) {
    resume();
  }
  return true;
}

export function waitForApproval(runId: string): Promise<void> {
  const session = sessions.get(runId);
  if (!session) return Promise.resolve();
  if (session.approved) return Promise.resolve();
  return new Promise((resolve) => {
    session.approvalWaiters.push(resolve);
  });
}

export async function* streamSessionEvents(
  runId: string
): AsyncGenerator<StreamEvent> {
  const session = ensureSession(runId);
  const delayMs = Number(process.env.DEMO_STREAM_DELAY_MS ?? 450);
  while (session.cursor < session.events.length) {
    const event = session.events[session.cursor]!;
    session.cursor += 1;
    yield event;
    if (delayMs > 0 && event.type !== "approval_required") {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    if (event.type === "approval_required" && !session.approved) {
      await waitForApproval(runId);
    }
  }
}
