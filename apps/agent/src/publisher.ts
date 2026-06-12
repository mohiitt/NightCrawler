/**
 * publisher.ts — Publish citations to cited.md after human approval.
 *
 * Strategy:
 *  1. Try Composio GITHUB_COMMIT_MULTIPLE_FILES (atomic commit, no SHA conflicts).
 *  2. Always also write locally so cited.md is visible in the repo during the demo.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Signal } from "@nightcrawler/contracts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CITED_MD = resolve(__dirname, "../../../cited.md");

function formatCitedEntry(signal: Signal, runId: string): string {
  const ts = new Date().toISOString();
  const rows = signal.citations
    .map((c) => `| ${c.source} | ${c.url} | ${c.quote} |`)
    .join("\n");
  return (
    `\n## ${ts} — ${signal.thesis.slice(0, 100)}\n` +
    `Confidence: ${(signal.confidence * 100).toFixed(0)}%  Run: \`${runId}\`\n\n` +
    `| Source | URL | Quote |\n| --- | --- | --- |\n${rows}\n`
  );
}

async function tryComposio(signal: Signal, runId: string): Promise<boolean> {
  const apiKey = process.env["COMPOSIO_API_KEY"];
  if (!apiKey) return false;

  try {
    const { Composio } = await import("composio-core");
    const client = new Composio({ apiKey });

    const entry = formatCitedEntry(signal, runId);
    const currentContent = existsSync(CITED_MD) ? readFileSync(CITED_MD, "utf8") : "";
    const newContent = currentContent + entry;

    const owner = process.env["GITHUB_OWNER"] ?? "mohiitt";
    const repo = process.env["GITHUB_REPO"] ?? "NightCrawler";

    console.log(`[publisher] Composio → GitHub ${owner}/${repo} cited.md`);

    // GITHUB_COMMIT_MULTIPLE_FILES: atomic upsert, no SHA needed
    const result = await client.actions.execute({
      actionName: "GITHUB_COMMIT_MULTIPLE_FILES",
      requestBody: {
        input: {
          owner,
          repo,
          branch: "main",
          message: `feat: NIGHTCRAWLER publishes citations (run ${runId.slice(0, 8)})`,
          upserts: [
            {
              path: "cited.md",
              content: newContent,
              encoding: "utf-8",
            },
          ],
          committer: {
            name: "NIGHTCRAWLER",
            email: "nightcrawler@osint.ai",
          },
        },
      },
    } as Parameters<typeof client.actions.execute>[0]);

    const res = result as { data?: { success?: boolean } };
    if (res?.data?.success === false) {
      throw new Error(`Composio action returned success=false: ${JSON.stringify(result)}`);
    }

    console.log("[publisher] ✓ Composio GitHub commit:", JSON.stringify(result).slice(0, 200));
    return true;
  } catch (err) {
    console.warn("[publisher] Composio failed:", (err as Error).message?.slice(0, 150));
    return false;
  }
}

export async function publishCitations(signal: Signal, runId: string): Promise<void> {
  const entry = formatCitedEntry(signal, runId);

  // Try Composio first (creates a real GitHub commit)
  const composioOk = await tryComposio(signal, runId);

  // Always write locally too — cited.md in the working tree is always fresh
  try {
    appendFileSync(CITED_MD, entry, "utf8");
    console.log(`[publisher] ✓ Appended to local ${CITED_MD}`);
  } catch (err) {
    console.error("[publisher] Local file write failed:", err);
  }

  if (composioOk) {
    console.log("[publisher] ✓ cited.md committed to GitHub via Composio");
  } else {
    console.log("[publisher] ℹ cited.md updated locally. Connect GitHub in Composio dashboard for auto-commits.");
  }
}
