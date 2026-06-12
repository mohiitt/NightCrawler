/**
 * Guild.ai approval gate agent — NIGHTCRAWLER
 *
 * This file runs IN Guild's sandbox (only @guildai/agents-sdk + zod allowed).
 * Deploy with: guild deploy apps/agent/guild/nightcrawler-gate.ts
 *
 * Flow:
 *  1. The local NIGHTCRAWLER server triggers this agent via Guild's API with
 *     the signal summary as input.
 *  2. The agent presents the summary and asks for human approval in Guild's UI.
 *  3. The human clicks Approve in the Guild dashboard.
 *  4. The agent returns { approved: true } and the local server is notified
 *     (or the human also hits POST /api/approve on the local server).
 *
 * This provides the "Liability Vault" demo moment (Act 3):
 *  - Guild dashboard shows the pending approval request
 *  - Langfuse trace link is presented alongside
 *  - Human reviews and clicks Approve
 */
import { llmAgent, userInterfaceTools } from "@guildai/agents-sdk";
import { z } from "zod";

const inputSchema = z.object({
  runId: z.string().describe("NIGHTCRAWLER run ID"),
  thesis: z.string().describe("Intelligence thesis to approve"),
  confidence: z.number().describe("Aggregate confidence 0-1"),
  tickers: z.string().describe("Comma-separated ticker signals, e.g. SHORT NVDA, LONG INTC"),
  langfuseUrl: z.string().optional().describe("Langfuse trace URL for verification"),
});

const outputSchema = z.object({
  approved: z.boolean(),
  reviewerNote: z.string().optional(),
});

export default llmAgent({
  identifier: "nightcrawler-approval-gate",
  description: "NIGHTCRAWLER Liability Vault — Human approval gate for market-moving intelligence signals.",
  tools: { ...userInterfaceTools },
  input: inputSchema,
  output: outputSchema,
  systemPrompt: `You are the NIGHTCRAWLER Liability Vault — the last line of defence before autonomous OSINT intelligence is published.

Your task: Present the intelligence signal summary to the human reviewer, explain why human approval is legally required (Mosaic Theory / Reg FD), and wait for their decision.

Present the signal as:
- Thesis: <thesis>
- Confidence: <confidence>%
- Proposed trades: <tickers>
- Langfuse trace: <langfuseUrl> (verify no hallucination)

Ask: "Do you approve publication of this intelligence signal? (Yes to publish, No to reject)"

If the human approves, return { approved: true }.
If the human rejects, return { approved: false, reviewerNote: <reason> }.`,
});
