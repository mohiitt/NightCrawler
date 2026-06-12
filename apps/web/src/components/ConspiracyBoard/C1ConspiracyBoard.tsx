"use client";

import type { ConspiracyBoardProps } from "@nightcrawler/contracts";
import { ConspiracyBoard } from "./ConspiracyBoard";

/**
 * Thesys C1 GenUI wrapper for ConspiracyBoard.
 * Install optional deps when enabling C1:
 *   pnpm --filter @nightcrawler/web add @thesysai/genui-sdk @crayonai/react-ui
 * Set NEXT_PUBLIC_USE_C1=true in .env.local
 */
export function C1ConspiracyBoard(
  props: ConspiracyBoardProps & { streaming?: boolean }
) {
  return <ConspiracyBoard {...props} />;
}
