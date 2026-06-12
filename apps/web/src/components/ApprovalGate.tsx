"use client";

type Props = {
  reason: string;
  approvalRef: string | null;
  onApprove: () => void;
  onReject: () => void;
  loading?: boolean;
};

export function ApprovalGate({
  reason,
  approvalRef,
  onApprove,
  onReject,
  loading,
}: Props) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#12121a",
          border: "1px solid #f5a623",
          borderRadius: 12,
          padding: 24,
          maxWidth: 480,
          width: "90%",
        }}
      >
        <div style={{ color: "#f5a623", fontSize: 12, letterSpacing: "0.1em", marginBottom: 8 }}>
          GUILD APPROVAL REQUIRED
        </div>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Publish market-moving intelligence?</h2>
        <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>{reason}</p>
        {approvalRef && (
          <p style={{ fontSize: 11, color: "#666", marginBottom: 16 }}>
            Ref: {approvalRef}
          </p>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onApprove}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px 16px",
              background: "#3dd68c",
              color: "#000",
              border: "none",
              borderRadius: 6,
              fontWeight: 700,
            }}
          >
            {loading ? "Approving…" : "Approve & Publish"}
          </button>
          <button
            onClick={onReject}
            disabled={loading}
            style={{
              padding: "10px 16px",
              background: "transparent",
              color: "#ff5c7a",
              border: "1px solid #ff5c7a",
              borderRadius: 6,
            }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
