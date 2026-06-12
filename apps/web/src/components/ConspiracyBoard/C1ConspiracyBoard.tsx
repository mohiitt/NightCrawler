"use client";

import { useEffect, useRef, useState } from "react";
import type { ConspiracyBoardProps } from "@nightcrawler/contracts";
import { C1Component, ThemeProvider } from "@thesysai/genui-sdk";
// CSS import resolved via webpack alias in next.config.ts (not in package exports)
import "@thesysai/genui-sdk/dist/genui-sdk.css";
import { ConspiracyBoard } from "./ConspiracyBoard";

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; c1Response: string }
  | { status: "error"; message: string };

/**
 * Thesys C1 GenUI wrapper for ConspiracyBoard.
 *
 * Calls /api/c1/board on the server which proxies to the Thesys C1 API
 * (keeping THESYS_C1_API_KEY server-side only).
 *
 * Falls back to the ReactFlow <ConspiracyBoard> if:
 *  - there are no nodes yet (nothing to render)
 *  - the C1 API call fails
 *  - C1 renders but returns an error
 */
export function C1ConspiracyBoard(props: ConspiracyBoardProps) {
  const [state, setState] = useState<FetchState>({ status: "idle" });
  // Track the last serialised props we fetched for — avoid redundant calls
  const lastFetchKey = useRef<string>("");

  useEffect(() => {
    if (!props.nodes.length) return;

    // Stable key so re-renders with identical data don't re-fetch
    const fetchKey = JSON.stringify({ nodes: props.nodes, edges: props.edges, thesis: props.thesis, confidence: props.confidence });
    if (fetchKey === lastFetchKey.current) return;
    lastFetchKey.current = fetchKey;

    setState({ status: "loading" });

    fetch("/api/c1/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(props),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<{ c1Response?: string; error?: string }>;
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setState({ status: "ready", c1Response: data.c1Response ?? "" });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "C1 render failed";
        setState({ status: "error", message });
      });
  }, [props]);

  if (state.status === "idle" || !props.nodes.length) {
    return <ConspiracyBoard {...props} />;
  }

  if (state.status === "loading") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#7c5cff",
          fontSize: 13,
          background: "#0a0a0f",
        }}
      >
        Generating intelligence visualization…
      </div>
    );
  }

  if (state.status === "error") {
    // Graceful fallback — log and use ReactFlow board
    console.warn("[C1ConspiracyBoard] falling back to ReactFlow:", state.message);
    return <ConspiracyBoard {...props} />;
  }

  return (
    <ThemeProvider mode="dark">
      <C1Component
        c1Response={state.c1Response}
        isStreaming={false}
        onError={(err) => {
          console.warn("[C1ConspiracyBoard] C1Component error:", err);
          setState({ status: "error", message: `C1 render error ${err.code}` });
        }}
      />
    </ThemeProvider>
  );
}
