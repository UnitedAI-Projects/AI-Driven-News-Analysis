import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { parse } from "node-html-parser";

const ANTHROPIC = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function looksLikeUrl(s: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(s.trim());
}

async function fetchArticleTextFromUrl(url: string): Promise<{ text: string }> {
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      const FirecrawlApp = (await import("@mendable/firecrawl-js")).default;
      const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
      const result = await firecrawl.scrape(url, { formats: ["markdown"] });
      if (result && result.markdown) {
        return { text: result.markdown.slice(0, 100000) };
      }
    } catch {
      // fall back to direct fetch
    }
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NewSeries/1.0)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const html = await res.text();
  const root = parse(html);
  root.querySelectorAll("script, style, nav, footer, header, aside").forEach((el) => el.remove());
  const articleEl =
    root.querySelector("article") ??
    root.querySelector('[role="main"]') ??
    root.querySelector("main") ??
    root.querySelector(".article-body") ??
    root.querySelector(".story-body") ??
    root.querySelector(".post-content") ??
    root.querySelector("#content") ??
    root.querySelector("body");
  const text = articleEl?.text?.replace(/\s+/g, " ").trim() ?? "";
  return { text: text.slice(0, 100000) };
}

function levelInstruction(level: string): string {
  if (level === "simple") {
    return "Use simple vocabulary and short sentences. Keep ideas easy for middle-school readers.";
  }
  if (level === "advanced") {
    return "Use sophisticated language, precise terminology, and a more technical tone for advanced readers.";
  }
  return "Use clear, neutral language with moderate complexity appropriate for general adult readers.";
}

async function getSummaryForLevel(articleText: string, level: string): Promise<string | null> {
  if (!ANTHROPIC || !articleText.trim()) return null;
  const truncated = articleText.length > 120000 ? articleText.slice(0, 120000) + "\n\n[Article truncated.]" : articleText;
  const style = levelInstruction(level);

  try {
    const msg = await ANTHROPIC.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are a concise news summarizer. Create a summary with TWO parts:

## STYLE LEVEL:
${style}

## PART 1 - OVERVIEW PARAGRAPH:
Write 2-3 sentences that give a high-level overview of the main story and its significance.

## PART 2 - KEY POINTS (BULLETS):
Provide 4-6 detailed bullet points covering the main facts.
- Each bullet should be ONE clear, factual sentence
- Focus on: who, what, when, where, why
- Use neutral, objective language
- No opinions or bias discussion
- Start each point with a dash (-)

## FORMAT REQUIREMENTS:
1. Start with the paragraph (2-3 sentences)
2. Add ONE blank line
3. Then add bullet points (each starting with "-")`,
      messages: [{ role: "user", content: `Summarize this article:\n\n${truncated}` }],
    });
    const block = msg.content.find((b) => b.type === "text");
    return block && "text" in block ? block.text.trim() : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let articleText = typeof body?.articleText === "string" ? body.articleText : "";
    const url = typeof body?.url === "string" ? body.url : "";
    const level = typeof body?.level === "string" ? body.level.toLowerCase() : "normal";

    if (!articleText.trim() && looksLikeUrl(url)) {
      const fetched = await fetchArticleTextFromUrl(url);
      articleText = fetched.text;
    }

    const summary = await getSummaryForLevel(articleText, level);
    if (!summary) {
      return NextResponse.json(
        { error: "Unable to regenerate summary at this time. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error in /api/summary-level:", error);
    return NextResponse.json(
      { error: "Unable to regenerate summary at this time. Please try again." },
      { status: 500 },
    );
  }
}
