import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

type ComparePayload = {
  articleA?: {
    summary?: string;
    biasScore?: number;
    keyFacts?: string[];
    overallAssessment?: string;
    dominantBias?: string;
    articleTitle?: string | null;
    url?: string | null;
  };
  articleB?: {
    summary?: string;
    biasScore?: number;
    keyFacts?: string[];
    overallAssessment?: string;
    dominantBias?: string;
    articleTitle?: string | null;
    url?: string | null;
  };
};

type HeadToHeadResponse = {
  moreBiasedArticle: "A" | "B" | "Tie";
  biasDifference: number;
  toneComparison: string;
  uniqueFactsA: string[];
  uniqueFactsB: string[];
  verdict: string;
};

function parseJSON(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}

function defaultHeadToHead(payload: ComparePayload): HeadToHeadResponse {
  const scoreA = typeof payload.articleA?.biasScore === "number" ? payload.articleA.biasScore : 75;
  const scoreB = typeof payload.articleB?.biasScore === "number" ? payload.articleB.biasScore : 75;
  const diff = Math.abs(scoreA - scoreB);

  const factsA = Array.isArray(payload.articleA?.keyFacts) ? payload.articleA?.keyFacts : [];
  const factsB = Array.isArray(payload.articleB?.keyFacts) ? payload.articleB?.keyFacts : [];
  const factsBSet = new Set(factsB.map((f) => f.toLowerCase().trim()));
  const factsASet = new Set(factsA.map((f) => f.toLowerCase().trim()));
  const uniqueFactsA = factsA.filter((fact) => !factsBSet.has(fact.toLowerCase().trim())).slice(0, 4);
  const uniqueFactsB = factsB.filter((fact) => !factsASet.has(fact.toLowerCase().trim())).slice(0, 4);

  const moreBiasedArticle = scoreA === scoreB ? "Tie" : scoreA > scoreB ? "A" : "B";

  return {
    moreBiasedArticle,
    biasDifference: diff,
    toneComparison:
      "Article A uses slightly stronger framing while Article B is more restrained, but both still emphasize selective details.",
    uniqueFactsA: uniqueFactsA.length ? uniqueFactsA : ["No clear unique facts identified in Article A."],
    uniqueFactsB: uniqueFactsB.length ? uniqueFactsB : ["No clear unique facts identified in Article B."],
    verdict:
      "Both articles cover the same event but frame it differently through emphasis and language choices. One article leans more on narrative tone, while the other centers factual sequencing. Reading both together gives a fuller picture of what happened.",
  };
}

export async function POST(request: NextRequest) {
  let body: ComparePayload = {};
  try {
    body = (await request.json()) as ComparePayload;
    const fallback = defaultHeadToHead(body);

    if (!ANTHROPIC) {
      return NextResponse.json(fallback);
    }

    const msg = await ANTHROPIC.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1400,
      system: `You compare two news analyses and produce a concise head-to-head report.
Return ONLY valid JSON with this exact schema:
{
  "moreBiasedArticle": "A" | "B" | "Tie",
  "biasDifference": <number>,
  "toneComparison": "<1-2 sentences comparing tone, such as emotional vs neutral>",
  "uniqueFactsA": ["<facts present in A but not B>", "..."],
  "uniqueFactsB": ["<facts present in B but not A>", "..."],
  "verdict": "<2-3 sentences summarizing key framing differences>"
}
Rules:
- biasDifference should be absolute point difference between the two bias scores.
- Keep arrays to 2-5 concise bullet-friendly facts each.
- Ensure verdict is exactly 2-3 sentences.
- No markdown, no extra keys.`,
      messages: [
        {
          role: "user",
          content: `Compare these two article analyses:\n\n${JSON.stringify(
            {
              articleA: body.articleA,
              articleB: body.articleB,
            },
            null,
            2,
          )}`,
        },
      ],
    });

    const block = msg.content.find((b) => b.type === "text");
    if (!block || !("text" in block)) {
      return NextResponse.json(fallback);
    }

    let parsed: Partial<HeadToHeadResponse> = {};
    try {
      parsed = parseJSON(block.text) as Partial<HeadToHeadResponse>;
    } catch {
      return NextResponse.json(fallback);
    }

    const result: HeadToHeadResponse = {
      moreBiasedArticle:
        parsed.moreBiasedArticle === "A" || parsed.moreBiasedArticle === "B" || parsed.moreBiasedArticle === "Tie"
          ? parsed.moreBiasedArticle
          : fallback.moreBiasedArticle,
      biasDifference:
        typeof parsed.biasDifference === "number" ? Math.max(0, Math.round(parsed.biasDifference)) : fallback.biasDifference,
      toneComparison:
        typeof parsed.toneComparison === "string" && parsed.toneComparison.trim()
          ? parsed.toneComparison.trim()
          : fallback.toneComparison,
      uniqueFactsA:
        Array.isArray(parsed.uniqueFactsA) && parsed.uniqueFactsA.length
          ? parsed.uniqueFactsA.map((f) => String(f))
          : fallback.uniqueFactsA,
      uniqueFactsB:
        Array.isArray(parsed.uniqueFactsB) && parsed.uniqueFactsB.length
          ? parsed.uniqueFactsB.map((f) => String(f))
          : fallback.uniqueFactsB,
      verdict:
        typeof parsed.verdict === "string" && parsed.verdict.trim() ? parsed.verdict.trim() : fallback.verdict,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/compare:", error);
    return NextResponse.json(defaultHeadToHead(body));
  }
}
