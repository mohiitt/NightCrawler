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

/**
 * Path 1 (preferred): GitHub REST API directly using a PAT.
 * Add GITHUB_TOKEN=ghp_... to .env to enable this path.
 */
async function tryGitHubDirect(newContent: string, runId: string): Promise<boolean> {
  const token = process.env["GITHUB_TOKEN"];
  if (!token) return false;

  const owner = process.env["GITHUB_OWNER"] ?? "mohiitt";
  const repo = process.env["GITHUB_REPO"] ?? "NightCrawler";
  const path = "cited.md";

  console.log(`[publisher] GitHub API → ${owner}/${repo}/${path}`);

  try {
    // Get current SHA (required for updates)
    const getResp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: { Authorization: `Bearer ${token}`, "User-Agent": "NIGHTCRAWLER" } }
    );
    const existing = getResp.ok ? await getResp.json() as { sha: string } : null;

    const putResp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "NIGHTCRAWLER",
        },
        body: JSON.stringify({
          message: `feat: NIGHTCRAWLER publishes citations (run ${runId.slice(0, 8)})`,
          content: Buffer.from(newContent).toString("base64"),
          ...(existing ? { sha: existing.sha } : {}),
          committer: { name: "NIGHTCRAWLER", email: "nightcrawler@osint.ai" },
        }),
      }
    );

    if (!putResp.ok) {
      const err = await putResp.json() as Record<string, unknown>;
      throw new Error(`HTTP ${putResp.status}: ${JSON.stringify(err).slice(0, 200)}`);
    }

    console.log(`[publisher] ✓ GitHub commit via PAT (run ${runId.slice(0, 8)})`);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.warn("[publisher] GitHub direct failed:", msg.slice(0, 200));
    return false;
  }
}

/**
 * Path 2: Composio — uses the connected GitHub OAuth account (no PAT needed).
 * Uses the SDK's Entity.execute which handles auth automatically.
 */
async function tryComposio(newContent: string, runId: string): Promise<boolean> {
  const apiKey = process.env["COMPOSIO_API_KEY"];
  if (!apiKey) return false;

  const owner = process.env["GITHUB_OWNER"] ?? "mohiitt";
  const repo = process.env["GITHUB_REPO"] ?? "NightCrawler";

  console.log(`[publisher] Composio → GitHub ${owner}/${repo} cited.md`);

  try {
    const { Composio } = await import("composio-core");
    const client = new Composio({ apiKey });
    const entity = client.getEntity("default");

    const result = await entity.execute({
      actionName: "GITHUB_COMMIT_MULTIPLE_FILES",
      params: {
        owner,
        repo,
        branch: "main",
        message: `feat: NIGHTCRAWLER publishes citations (run ${runId.slice(0, 8)})`,
        upserts: [{ path: "cited.md", content: newContent, encoding: "utf-8" }],
        committer: { name: "NIGHTCRAWLER", email: "nightcrawler@osint.ai" },
      },
    });

    console.log("[publisher] ✓ Composio GitHub commit:", JSON.stringify(result).slice(0, 200));
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.warn("[publisher] Composio failed:", msg.slice(0, 200));
    return false;
  }
}

export async function publishCitations(signal: Signal, runId: string): Promise<void> {
  const entry = formatCitedEntry(signal, runId);
  const currentContent = existsSync(CITED_MD) ? readFileSync(CITED_MD, "utf8") : "";
  const newContent = currentContent + entry;

  // Path 1: GitHub PAT (fastest, most reliable — add GITHUB_TOKEN to .env)
  const githubOk = await tryGitHubDirect(newContent, runId);

  // Path 2: Composio OAuth (if GITHUB_TOKEN not set)
  const composioOk = !githubOk && await tryComposio(newContent, runId);

  // Always also write locally — cited.md is always fresh for the demo
  try {
    appendFileSync(CITED_MD, entry, "utf8");
    console.log(`[publisher] ✓ Appended to local ${CITED_MD}`);
  } catch (err) {
    console.error("[publisher] Local file write failed:", err);
  }

  if (!githubOk && !composioOk) {
    console.log("[publisher] ℹ Add GITHUB_TOKEN=ghp_... to .env for auto-commits to GitHub.");
  }
}
