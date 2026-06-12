import { NextRequest, NextResponse } from "next/server";
import { conspiracyBoardSchema } from "@nightcrawler/contracts";

const C1_BASE_URL = "https://api.thesys.dev/v1/embed";
const C1_MODEL = "c1/anthropic/claude-sonnet-4.6/v-20260331";

const SYSTEM_PROMPT = `You are NIGHTCRAWLER, an autonomous OSINT & financial intelligence system.
Visualize the provided intelligence board data as a rich, dark-themed dashboard.

The board contains:
- A thesis: the main hypothesis under investigation
- A confidence score: probability the thesis is correct (0–1)
- Evidence nodes typed as: news | flight | filing | market | synthesis
- Relationship edges connecting nodes with labeled causal links

Render this as a compelling intelligence brief with:
1. A hero section: thesis text + confidence badge
2. Evidence node cards grouped by type — show label, detail, and per-node confidence
3. A relationship table summarising edge source → target → label connections
4. A synthesis section if synthesis nodes exist

Use dark colours (#0a0a0f background, #7c5cff accent, #3dd68c for positive, #e74c3c for risk).
Keep the layout dense and analytical — this is an ops dashboard, not a marketing page.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const boardProps = conspiracyBoardSchema.parse(body);

    const apiKey = process.env.THESYS_C1_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "THESYS_C1_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const userMessage = `Render this NIGHTCRAWLER intelligence board:\n\n${JSON.stringify(boardProps, null, 2)}`;

    const response = await fetch(`${C1_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: C1_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      return NextResponse.json(
        { error: `C1 API error ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const c1Response = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ c1Response });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate C1 response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
