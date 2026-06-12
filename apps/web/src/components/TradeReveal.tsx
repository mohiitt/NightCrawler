"use client";

import { DEMO_TRADE } from "@/lib/demoScript";

type Props = {
  visible: boolean;
  locked?: boolean;
};

export function TradeReveal({ visible, locked = true }: Props) {
  if (!visible) return null;

  return (
    <div className="panel trade-reveal">
      <h3 className="panel-title">{DEMO_TRADE.headline}</h3>
      <p className="trade-thesis">{DEMO_TRADE.thesis}</p>
      <ul className="trade-tickers">
        {DEMO_TRADE.tickers.map((t) => (
          <li key={t.ticker}>
            <span className={t.direction === "LONG" ? "long" : "short"}>
              {t.direction}
            </span>{" "}
            {t.ticker}
          </li>
        ))}
      </ul>
      {locked && (
        <p className="trade-locked">
          Full rationale locked behind Coinbase CDP / x402 paywall until buyer unlocks.
        </p>
      )}
    </div>
  );
}
