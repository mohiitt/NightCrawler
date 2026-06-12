import type {
  ConspiracyEdge,
  ConspiracyNode,
  PublicSignal,
  StreamEvent,
} from "@nightcrawler/contracts";

export type RunPhase =
  | "idle"
  | "running"
  | "awaiting_approval"
  | "publishing"
  | "complete"
  | "error";

export type RunState = {
  phase: RunPhase;
  runId: string | null;
  statusMessage: string;
  progress: number;
  nodes: ConspiracyNode[];
  edges: ConspiracyEdge[];
  signal: PublicSignal | null;
  approvalReason: string | null;
  approvalRef: string | null;
  published: boolean;
  error: string | null;
};

export const initialRunState: RunState = {
  phase: "idle",
  runId: null,
  statusMessage: "Ready",
  progress: 0,
  nodes: [],
  edges: [],
  signal: null,
  approvalReason: null,
  approvalRef: null,
  published: false,
  error: null,
};

export function runReducer(state: RunState, event: StreamEvent): RunState {
  switch (event.type) {
    case "status":
      return {
        ...state,
        phase: state.phase === "idle" ? "running" : state.phase,
        statusMessage: event.payload.message,
        progress: event.payload.progress ?? state.progress,
      };
    case "node": {
      const exists = state.nodes.some((n) => n.id === event.payload.id);
      return {
        ...state,
        nodes: exists
          ? state.nodes.map((n) =>
              n.id === event.payload.id ? event.payload : n
            )
          : [...state.nodes, event.payload],
      };
    }
    case "edge": {
      const exists = state.edges.some((e) => e.id === event.payload.id);
      return {
        ...state,
        edges: exists
          ? state.edges.map((e) =>
              e.id === event.payload.id ? event.payload : e
            )
          : [...state.edges, event.payload],
      };
    }
    case "approval_required":
      return {
        ...state,
        phase: "awaiting_approval",
        approvalReason: event.payload.reason,
        approvalRef: event.payload.approvalRef ?? null,
        runId: event.payload.runId,
      };
    case "signal":
      return {
        ...state,
        phase: state.phase === "awaiting_approval" ? "publishing" : state.phase,
        signal: event.payload,
        nodes: event.payload.nodes,
        edges: event.payload.edges,
        progress: Math.max(state.progress, 0.85),
      };
    case "done":
      return {
        ...state,
        phase: "complete",
        published: event.payload.published,
        progress: 1,
        statusMessage: event.payload.published
          ? "Signal published to cited.md"
          : "Run complete",
      };
    case "error":
      return {
        ...state,
        phase: "error",
        error: event.payload.message,
        statusMessage: event.payload.message,
      };
    default:
      return state;
  }
}

export function boardPropsFromState(state: RunState) {
  return {
    title: "NIGHTCRAWLER Conspiracy Board",
    thesis: state.signal?.thesis ?? "Analyzing open-web intelligence…",
    confidence: state.signal?.confidence ?? 0,
    nodes: state.nodes,
    edges: state.edges,
  };
}

export function startRunState(runId: string): RunState {
  return {
    ...initialRunState,
    phase: "running",
    runId,
    statusMessage: "Streaming intelligence…",
    progress: 0.02,
  };
}

export type DashboardAction =
  | StreamEvent
  | { type: "run_started"; runId: string };

export function dashboardReducer(
  state: RunState,
  action: DashboardAction
): RunState {
  if (action.type === "run_started") {
    return startRunState(action.runId);
  }
  return runReducer(state, action);
}
