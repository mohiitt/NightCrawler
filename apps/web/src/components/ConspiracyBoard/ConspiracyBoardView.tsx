"use client";

import dynamic from "next/dynamic";
import type { ConspiracyBoardProps } from "@nightcrawler/contracts";
import { ConspiracyBoard } from "./ConspiracyBoard";

const C1ConspiracyBoard = dynamic(
  () => import("./C1ConspiracyBoard").then((m) => m.C1ConspiracyBoard),
  {
    ssr: false,
    loading: () => (
      <div className="board-loading">Loading GenUI board…</div>
    ),
  }
);

type Props = ConspiracyBoardProps & { streaming?: boolean };

export function ConspiracyBoardView(props: Props) {
  const { streaming, ...boardProps } = props;
  const useC1 = process.env.NEXT_PUBLIC_USE_C1 === "true";

  if (useC1) {
    return <C1ConspiracyBoard {...boardProps} streaming={streaming} />;
  }

  return <ConspiracyBoard {...boardProps} streaming={streaming} />;
}
