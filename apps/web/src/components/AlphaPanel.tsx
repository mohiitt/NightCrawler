"use client";

import { useState } from "react";
import { API_ROUTES, type AlphaResponse } from "@nightcrawler/contracts";
import type { RunPhase } from "@/lib/runState";

type Props = {
  runId: string | null;
  phase: RunPhase;
};

export function AlphaPanel({ runId, phase }: Props) {
  const [alpha, setAlpha] = useState<AlphaResponse["alpha"] | null>(null);
  const [status, setStatus] = useState<string>("Locked behind x402 paywall");
  const [loading, setLoading] = useState(false);

  const unlockDev = async () => {
    if (!runId) return;
    setLoading(true);
    setStatus("Fetching alpha…");
    try {
      const res = await fetch(
        `${API_ROUTES.alpha}?runId=${encodeURIComponent(runId)}`
      );
      if (res.status === 402) {
        setStatus("402 Payment Required — run buyer bot to unlock");
        return;
      }
      if (!res.ok) {
        throw new Error(`Alpha fetch failed (${res.status})`);
      }
      const body = (await res.json()) as AlphaResponse;
      setAlpha(body.alpha);
      setStatus("Alpha unlocked");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unlock failed");
    } finally {
      setLoading(false);
    }
  };

  const ready = phase === "complete" && Boolean(runId);

  return (
    <div className="panel alpha-panel">
      <h3 className="panel-title">ALPHA PAYLOAD</h3>
      <p className="alpha-status">{status}</p>
      {alpha ? (
        <div className="alpha-body">
          <div className="alpha-action">{alpha.action}</div>
          <ul className="alpha-tickers">
            {alpha.tickers.map((t) => (
              <li key={t.ticker}>
                <span className={t.direction === "LONG" ? "long" : "short"}>
                  {t.direction}
                </span>{" "}
                {t.ticker}
              </li>
            ))}
          </ul>
          <p className="alpha-rationale">{alpha.rationale}</p>
        </div>
      ) : (
        <button
          className="btn-secondary"
          onClick={unlockDev}
          disabled={!ready || loading}
        >
          {loading ? "Checking…" : "Try unlock (dev / no wallet)"}
        </button>
      )}
      <p className="alpha-hint">
        Production unlock: <code>pnpm --filter @nightcrawler/buyer buy</code>
      </p>
    </div>
  );
}
