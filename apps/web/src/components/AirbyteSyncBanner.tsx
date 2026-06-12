"use client";

import { useEffect, useState } from "react";
import { AIRBYTE_SYNC_STEPS } from "@/lib/demoScript";

type Props = {
  active: boolean;
  onComplete?: () => void;
};

export function AirbyteSyncBanner({ active, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setStep(0);
      setVisible(false);
      return;
    }
    setVisible(true);
    setStep(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      if (i >= AIRBYTE_SYNC_STEPS.length) {
        clearInterval(timer);
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 800);
        return;
      }
      setStep(i);
    }, 900);
    return () => clearInterval(timer);
  }, [active, onComplete]);

  if (!visible) return null;

  return (
    <div className="airbyte-banner">
      <span className="airbyte-badge">AIRBYTE</span>
      <span className="airbyte-step">{AIRBYTE_SYNC_STEPS[step]}</span>
      <span className="airbyte-progress">
        {step + 1}/{AIRBYTE_SYNC_STEPS.length}
      </span>
    </div>
  );
}
