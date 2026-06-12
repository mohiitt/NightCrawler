import type { PublicSignal } from "@nightcrawler/contracts";

export function SignalSummary({ signal }: { signal: PublicSignal | null }) {
  if (!signal) {
    return (
      <div style={{ padding: 16, color: "#555", fontSize: 13 }}>
        Signal will appear after corroboration completes.
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ fontSize: 13, color: "#7c5cff", marginBottom: 8 }}>SYNTHESIZED SIGNAL</h3>
      <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>{signal.thesis}</p>
      <div style={{ fontSize: 12, color: "#3dd68c", marginBottom: 16 }}>
        Confidence: {(signal.confidence * 100).toFixed(0)}%
      </div>
      <h4 style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>CITATIONS</h4>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        {signal.citations.map((c, i) => (
          <li
            key={i}
            style={{
              padding: 10,
              background: "#0e0e16",
              border: "1px solid #2a2a3a",
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            <div style={{ color: "#7c5cff", marginBottom: 4 }}>{c.source}</div>
            <div style={{ color: "#aaa", fontStyle: "italic", marginBottom: 4 }}>
              &ldquo;{c.quote}&rdquo;
            </div>
            <a href={c.url} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>
              {c.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
