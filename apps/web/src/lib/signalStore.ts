import type { Signal } from "@nightcrawler/contracts";

const store = new Map<string, Signal>();

export function setSignal(runId: string, signal: Signal): void {
  store.set(runId, signal);
}

export function getSignal(runId: string): Signal | undefined {
  return store.get(runId);
}

export function hasSignal(runId: string): boolean {
  return store.has(runId);
}
