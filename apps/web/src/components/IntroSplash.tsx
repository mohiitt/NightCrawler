"use client";

type Props = {
  onLaunch: () => void;
  launching?: boolean;
};

export function IntroSplash({ onLaunch, launching }: Props) {
  return (
    <div className="intro-splash">
      <div className="intro-logo pulse">NIGHTCRAWLER</div>
      <p className="intro-tagline">
        Autonomous intelligence broker — reads the open web, proves what&apos;s next,
        sells the future.
      </p>
      <button
        className="btn-primary intro-launch"
        onClick={onLaunch}
        disabled={launching}
      >
        {launching ? "Initializing…" : "Launch NIGHTCRAWLER"}
      </button>
      <p className="intro-hint">Airbyte ingest + OpenUI board begin on launch</p>
    </div>
  );
}
