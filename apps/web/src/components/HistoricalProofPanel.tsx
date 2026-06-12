"use client";

type Props = {
  visible: boolean;
};

/** Placeholder for the final demo beat — historical backtest slide. */
export function HistoricalProofPanel({ visible }: Props) {
  if (!visible) return null;

  return (
    <div className="panel historical-proof">
      <h3 className="panel-title">HISTORICAL PROOF (T-4 WEEKS)</h3>
      <p className="historical-caption">
        Agent signal generated <strong>14 hours before</strong> the official semiconductor
        export press release. No stolen data — only public web + OLAP math.
      </p>
      <div className="historical-chart" aria-hidden>
        <div className="chart-bar chart-signal">
          <span>Agent SHORT</span>
        </div>
        <div className="chart-gap">14h</div>
        <div className="chart-bar chart-release">
          <span>Press release</span>
        </div>
        <div className="chart-bar chart-bleed">
          <span>NVDA −12%</span>
        </div>
      </div>
    </div>
  );
}
