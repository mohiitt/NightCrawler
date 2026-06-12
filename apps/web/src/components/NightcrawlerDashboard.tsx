"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  API_ROUTES,
  streamEventSchema,
  type ApproveRequest,
} from "@nightcrawler/contracts";
import {
  boardPropsFromState,
  dashboardReducer,
  initialRunState,
} from "@/lib/runState";
import { ApprovalGate } from "./ApprovalGate";
import { ConspiracyBoardView } from "./ConspiracyBoard/ConspiracyBoardView";
import { SignalSummary } from "./SignalSummary";
import { StatusBar } from "./StatusBar";
import { AlphaPanel } from "./AlphaPanel";

export function NightcrawlerDashboard() {
  const [state, dispatch] = useReducer(dashboardReducer, initialRunState);
  const [starting, setStarting] = useState(false);
  const [approving, setApproving] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const closeStream = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, []);

  useEffect(() => () => closeStream(), [closeStream]);

  const connectStream = useCallback(
    (runId: string) => {
      closeStream();
      const url = `${API_ROUTES.stream}?runId=${encodeURIComponent(runId)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (message) => {
        try {
          const event = streamEventSchema.parse(JSON.parse(message.data));
          dispatch(event);
          if (event.type === "done" || event.type === "error") {
            closeStream();
          }
        } catch {
          dispatch({
            type: "error",
            payload: { message: "Malformed SSE event" },
          });
          closeStream();
        }
      };

      es.onerror = () => {
        closeStream();
      };
    },
    [closeStream]
  );

  const startRun = async () => {
    setStarting(true);
    try {
      const res = await fetch(API_ROUTES.run, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "trump-china" }),
      });
      if (!res.ok) throw new Error("Failed to start run");
      const { runId } = (await res.json()) as { runId: string };
      dispatch({ type: "run_started", runId });
      connectStream(runId);
    } catch (error) {
      dispatch({
        type: "error",
        payload: {
          message: error instanceof Error ? error.message : "Start failed",
        },
      });
    } finally {
      setStarting(false);
    }
  };

  const handleApprove = async (approved: boolean) => {
    if (!state.runId) return;
    setApproving(true);
    try {
      const body: ApproveRequest = {
        runId: state.runId,
        approved,
        approvalRef: state.approvalRef ?? undefined,
      };
      const res = await fetch(API_ROUTES.approve, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Approval request failed");
      if (!approved) {
        dispatch({
          type: "error",
          payload: { message: "Publication rejected by operator" },
        });
        closeStream();
      } else {
        dispatch({
          type: "status",
          payload: { message: "Approved — publishing signal…", progress: 0.9 },
        });
      }
    } catch (error) {
      dispatch({
        type: "error",
        payload: {
          message: error instanceof Error ? error.message : "Approval failed",
        },
      });
    } finally {
      setApproving(false);
    }
  };

  const boardProps = boardPropsFromState(state);
  const canStart =
    state.phase === "idle" ||
    state.phase === "complete" ||
    state.phase === "error";

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <div className="brand">NIGHTCRAWLER</div>
          <div className="tagline">Autonomous OSINT &amp; Alpha Broker</div>
        </div>
        <button
          className="btn-primary"
          onClick={startRun}
          disabled={starting || !canStart}
        >
          {starting ? "Starting…" : canStart ? "Start Run" : "Run Active"}
        </button>
      </header>

      <div className="dashboard-grid">
        <aside className="sidebar">
          <StatusBar state={state} />
          <div className="panel">
            <SignalSummary signal={state.signal} />
          </div>
          <AlphaPanel runId={state.runId} phase={state.phase} />
        </aside>

        <main className="board-panel">
          <ConspiracyBoardView {...boardProps} />
        </main>
      </div>

      {state.phase === "awaiting_approval" && state.approvalReason && (
        <ApprovalGate
          reason={state.approvalReason}
          approvalRef={state.approvalRef}
          onApprove={() => handleApprove(true)}
          onReject={() => handleApprove(false)}
          loading={approving}
        />
      )}
    </div>
  );
}
