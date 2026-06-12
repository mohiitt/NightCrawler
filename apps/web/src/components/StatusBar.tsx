import type { RunState } from "@/lib/runState";

export function StatusBar({ state }: { state: RunState }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        background: "#12121a",
        border: "1px solid #2a2a3a",
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 11, color: "#7c5cff", marginBottom: 6 }}>
        PHASE: {state.phase.toUpperCase().replace("_", " ")}
      </div>
      <div style={{ fontSize: 13, marginBottom: 10 }}>{state.statusMessage}</div>
      <div
        style={{
          height: 4,
          background: "#2a2a3a",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(state.progress * 100)}%`,
            background: "linear-gradient(90deg, #7c5cff, #3dd68c)",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      {state.error && (
        <div style={{ color: "#ff5c7a", fontSize: 12, marginTop: 8 }}>{state.error}</div>
      )}
    </div>
  );
}
