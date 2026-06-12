"use client";

type Props = {
  confidence: number;
  visible: boolean;
};

export function HighConvictionSignal({ confidence, visible }: Props) {
  if (!visible) return null;

  return (
    <div className="high-conviction" role="status">
      <span className="high-conviction-label">HIGH CONVICTION SIGNAL</span>
      <span className="high-conviction-pct">
        {(confidence * 100).toFixed(0)}% mosaic confidence
      </span>
    </div>
  );
}
