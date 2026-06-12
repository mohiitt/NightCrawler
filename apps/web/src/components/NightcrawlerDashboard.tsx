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
import { AirbyteSyncBanner } from "./AirbyteSyncBanner";
import { AlphaPanel } from "./AlphaPanel";
import { ApprovalGate } from "./ApprovalGate";
import { ConspiracyBoardView } from "./ConspiracyBoard/ConspiracyBoardView";
import { HighConvictionSignal } from "./HighConvictionSignal";
import { HistoricalProofPanel } from "./HistoricalProofPanel";
import { IntroSplash } from "./IntroSplash";
import { SignalSummary } from "./SignalSummary";
import { SponsorStrip } from "./SponsorStrip";
import { StatusBar } from "./StatusBar";
import { TradeReveal } from "./TradeReveal";

export function NightcrawlerDashboard() {
  const [showIntro, setShowIntro] = useState(true);
  const [airbyteActive, setAirbyteActive] = useState(false);
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

  const startRun = useCallback(async () => {
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
  }, [connectStream]);

  const handleLaunch = () => {
    setShowIntro(false);
    setAirbyteActive(true);
    void startRun();
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
          payload: {
            message: "Approved — Composio publishing to cited.md…",
            progress: 0.92,
          },
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

  if (showIntro) {
    return <IntroSplash onLaunch={handleLaunch} launching={starting} />;
  }

  const boardProps = boardPropsFromState(state);
  const canStart =
    state.phase === "idle" ||
    state.phase === "complete" ||
    state.phase === "error";
  const showConviction =
    Boolean(state.signal) && (state.signal?.confidence ?? 0) >= 0.85;
  const showTrade = Boolean(state.signal);
  const showHistorical = state.phase === "complete" && state.published;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <div className="brand">NIGHTCRAWLER</div>
          <div className="tagline">OpenUI Lang · ClickHouse OLAP · Guild-governed alpha broker</div>
        </div>
        <button
          className="btn-primary"
          onClick={startRun}
          disabled={starting || !canStart}
        >
          {starting ? "Starting…" : canStart ? "New Run" : "Run Active"}
        </button>
      </header>

      <SponsorStrip />
      <AirbyteSyncBanner active={airbyteActive} onComplete={() => setAirbyteActive(false)} />

      <HighConvictionSignal
        confidence={state.signal?.confidence ?? 0}
        visible={showConviction}
      />

      <div className="dashboard-grid">
        <aside className="sidebar">
          <StatusBar state={state} />
          <TradeReveal visible={showTrade} locked={state.phase !== "complete"} />
          <div className="panel">
            <SignalSummary signal={state.signal} />
          </div>
          <AlphaPanel runId={state.runId} phase={state.phase} />
          <HistoricalProofPanel visible={showHistorical} />
        </aside>

        <main className="board-panel">
          <ConspiracyBoardView {...boardProps} streaming={state.phase === "running"} />
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
