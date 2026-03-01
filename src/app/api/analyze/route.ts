import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { parse } from "node-html-parser";

const ANTHROPIC = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function looksLikeUrl(s: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(s.trim());
}

async function fetchArticleTextFromUrl(url: string): Promise<{ text: string; title?: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NewSeries/1.0)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const html = await res.text();
  const root = parse(html);
  root.querySelectorAll("script, style, nav, footer, header, aside").forEach((el) => el.remove());
  const title = root.querySelector("title")?.text?.trim() ?? undefined;
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
  return { text: text.slice(0, 100000), title };
}

// ── Types ──────────────────────────────────────────────────────────────────────

type BiasSignal = { title: string; explanation: string };

type BiasFlag = {
  text: string;
  type: "loaded_language" | "opinion_as_fact" | "unverified_claim" | "framing_bias";
  explanation: string;
};

type DifficultWordCategory = "Commonly Confused" | "Irregular Verbs" | "Phrasal Verbs" | "Idioms";

type DifficultWord = {
  word: string;
  definition: string;
  example: string;
  pronunciation: string;
  category: DifficultWordCategory;
};

type AnalysisResponse = {
  summary: string;
  biasScore: number;
  biasSignals: BiasSignal[];
  biasFlagged: BiasFlag[];
  keyFacts: string[];
  reflectionQuestions: string[];
  difficultWords: DifficultWord[];
};

// ── Fallbacks ──────────────────────────────────────────────────────────────────

const BASE_REFLECTION_QUESTIONS: string[] = [
  "Who benefits from this framing, and who might be left out?",
  "What would a headline from the 'other side' look like?",
  "Which claims are verified with evidence vs. asserted?",
  "What would you need to read next to form a more complete view?",
];

const BASE_DIFFICULT_WORDS: DifficultWord[] = [
  {
    word: "bias",
    pronunciation: "BY-uss",
    definition: "A feeling or opinion that makes you support one side more than another, even when you should be fair.",
    example: "The article shows bias because it mostly supports one point of view.",
    category: "Commonly Confused",
  },
];

// ── Helper ─────────────────────────────────────────────────────────────────────

function parseJSON(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}

// ── Claude calls ───────────────────────────────────────────────────────────────

async function getSummaryFromClaude(articleText: string): Promise<string | null> {
  if (!ANTHROPIC || !articleText.trim()) return null;
  const truncated = articleText.length > 120000 ? articleText.slice(0, 120000) + "\n\n[Article truncated.]" : articleText;
  try {
    const msg = await ANTHROPIC.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are a concise news summarizer. Write a plain factual summary of the article (topic, key events, people involved) in 2–4 short paragraphs. Use neutral language. Do NOT discuss bias or framing.`,
      messages: [{ role: "user", content: `Summarize this article:\n\n${truncated}` }],
    });
    const block = msg.content.find((b) => b.type === "text");
    return block && "text" in block ? block.text.trim() : null;
  } catch (e) {
    console.log("Summary error:", e);
    return null;
  }
}

async function getBiasAnalysisFromClaude(articleText: string): Promise<{ score: number; flagged: BiasFlag[] }> {
  if (!ANTHROPIC || !articleText.trim()) return { score: 75, flagged: [] };
  const truncated = articleText.length > 120000 ? articleText.slice(0, 120000) : articleText;
  try {
    const msg = await ANTHROPIC.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: `You are a media bias analyst. Identify the top 5 most significant words or phrases in the article that show bias.
For each flagged item return:
- "text": the exact word or phrase from the article
- "type": one of ["loaded_language", "opinion_as_fact", "unverified_claim", "framing_bias"]
- "explanation": one sentence explaining why it is biased
Also return a "score" from 0–100 (100 = fully neutral, 0 = highly biased).

Return ONLY valid JSON with no markdown formatting:
{ "score": <number>, "flagged": [{ "text": "...", "type": "...", "explanation": "..." }] }`,
      messages: [{ role: "user", content: `Analyze bias in this article:\n\n${truncated}` }],
    });
    const block = msg.content.find((b) => b.type === "text");
    if (!block || !("text" in block)) {
      console.log("Bias: no text block found");
      return { score: 75, flagged: [] };
    }
    console.log("Bias raw response:", block.text.slice(0, 300));
    const parsed = parseJSON(block.text);
    return { score: parsed.score ?? 75, flagged: parsed.flagged ?? [] };
  } catch (e) {
    console.log("Bias parse error:", e);
    return { score: 75, flagged: [] };
  }
}

async function getKeyFactsFromClaude(articleText: string): Promise<string[]> {
  if (!ANTHROPIC || !articleText.trim()) return [];
  const truncated = articleText.length > 120000 ? articleText.slice(0, 120000) : articleText;
  try {
    const msg = await ANTHROPIC.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `You are a news summarizer. Extract 3–5 key factual claims from the article (who, what, when, where). Facts only — no opinions. Return ONLY a JSON array of strings with no markdown formatting: ["fact 1", "fact 2"]`,
      messages: [{ role: "user", content: `Extract key facts:\n\n${truncated}` }],
    });
    const block = msg.content.find((b) => b.type === "text");
    if (!block || !("text" in block)) {
      console.log("Key facts: no text block found");
      return [];
    }
    console.log("Key facts raw response:", block.text.slice(0, 300));
    const parsed = parseJSON(block.text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.log("Key facts parse error:", e);
    return [];
  }
}

async function getReflectionQuestionsFromClaude(articleText: string): Promise<string[]> {
  if (!ANTHROPIC || !articleText.trim()) return BASE_REFLECTION_QUESTIONS;
  const truncated = articleText.length > 120000 ? articleText.slice(0, 120000) : articleText;
  try {
    const msg = await ANTHROPIC.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `You are a critical thinking educator. Generate exactly 4 thought-provoking questions about this specific article. Every question must reference specific details, people, or events from the article. Do NOT write generic questions. Return ONLY a JSON array of 4 strings with no markdown formatting.`,
      messages: [{ role: "user", content: `Generate 4 critical thinking questions:\n\n${truncated}` }],
    });
    const block = msg.content.find((b) => b.type === "text");
    if (!block || !("text" in block)) {
      console.log("Reflection: no text block found");
      return BASE_REFLECTION_QUESTIONS;
    }
    console.log("Reflection raw response:", block.text.slice(0, 300));
    const parsed = parseJSON(block.text);
    return Array.isArray(parsed) && parsed.length === 4 ? parsed : BASE_REFLECTION_QUESTIONS;
  } catch (e) {
    console.log("Reflection parse error:", e);
    return BASE_REFLECTION_QUESTIONS;
  }
}

async function getDifficultWordsFromClaude(articleText: string): Promise<DifficultWord[]> {
  if (!ANTHROPIC || !articleText.trim()) return BASE_DIFFICULT_WORDS;
  const truncated = articleText.length > 120000 ? articleText.slice(0, 120000) : articleText;
  try {
    const msg = await ANTHROPIC.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are an ESL vocabulary assistant. Find 4–6 difficult words or phrases that actually appear in the article and that ESL learners might struggle with. Do NOT include everyday words.
Return ONLY a JSON array with no markdown formatting:
[{ "word": "...", "pronunciation": "...", "definition": "...", "example": "...", "category": "Commonly Confused" | "Irregular Verbs" | "Phrasal Verbs" | "Idioms" }]`,
      messages: [{ role: "user", content: `Find difficult words in this article:\n\n${truncated}` }],
    });
    const block = msg.content.find((b) => b.type === "text");
    if (!block || !("text" in block)) {
      console.log("Difficult words: no text block found");
      return BASE_DIFFICULT_WORDS;
    }
    console.log("Difficult words raw response:", block.text.slice(0, 300));
    const parsed = parseJSON(block.text);
    return Array.isArray(parsed) ? parsed : BASE_DIFFICULT_WORDS;
  } catch (e) {
    console.log("Difficult words parse error:", e);
    return BASE_DIFFICULT_WORDS;
  }
}

// ── analyzeText ────────────────────────────────────────────────────────────────

function analyzeText(
  rawText: string,
  url?: string | null,
  summaryOverride?: string | null,
  difficultWordsOverride?: DifficultWord[],
  biasOverride?: { score: number; flagged: BiasFlag[] },
  keyFactsOverride?: string[],
  reflectionQuestionsOverride?: string[],
): AnalysisResponse {
  const text = rawText.trim();
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

  const biasScore = biasOverride?.score ?? 75;
  const biasFlagged = biasOverride?.flagged ?? [];
  const keyFacts = keyFactsOverride?.length ? keyFactsOverride : ["Could not extract key facts."];
  const reflectionQuestions = reflectionQuestionsOverride?.length ? reflectionQuestionsOverride : BASE_REFLECTION_QUESTIONS;

  let summary: string;
  if (summaryOverride?.trim()) {
    summary = summaryOverride.trim();
    if (url) summary += `\n\n(Source: ${url})`;
  } else if (wordCount === 0) {
    summary = "We could not detect much article text to analyze. Try pasting more of the story, or submit a valid article URL.";
  } else {
    summary = "We couldn't generate a short summary for this article. The bias analysis and other sections below are still based on the text.";
    if (url) summary += ` (Source: ${url})`;
  }

  return {
    summary,
    biasScore,
    biasSignals: [],
    biasFlagged,
    keyFacts,
    reflectionQuestions,
    difficultWords: difficultWordsOverride ?? BASE_DIFFICULT_WORDS,
  };
}

// ── POST handler ───────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let articleText =
      (typeof body?.articleText === "string" ? body.articleText : "") ||
      (typeof body?.text === "string" ? body.text : "");
    let url = typeof body?.url === "string" ? body.url : null;
    let articleTitle: string | null = null;

    if (articleText?.trim() && looksLikeUrl(articleText.trim())) {
      try {
        const { text, title } = await fetchArticleTextFromUrl(articleText.trim());
        url = url || articleText.trim();
        articleText = text;
        articleTitle = title ?? null;
      } catch (err) {
        console.error("Error fetching URL:", err);
        return NextResponse.json(
          { error: "Could not fetch or extract article from that URL. Try pasting the article text instead." },
          { status: 400 },
        );
      }
    } else if ((!articleText || !articleText.trim()) && url?.trim() && looksLikeUrl(url.trim())) {
      try {
        const { text, title } = await fetchArticleTextFromUrl(url.trim());
        articleText = text;
        articleTitle = title ?? null;
      } catch (err) {
        console.error("Error fetching URL:", err);
        return NextResponse.json(
          { error: "Could not fetch or extract article from that URL. Try pasting the article text instead." },
          { status: 400 },
        );
      }
    }

    const resolvedText = articleText?.trim() ?? "";
    console.log("Resolved text length:", resolvedText.length);
    console.log("API key present:", !!process.env.ANTHROPIC_API_KEY);

    const [summaryFromClaude, difficultWordsFromClaude, biasAnalysis, keyFactsFromClaude, reflectionQuestionsFromClaude] =
      await Promise.all([
        getSummaryFromClaude(resolvedText),
        getDifficultWordsFromClaude(resolvedText),
        getBiasAnalysisFromClaude(resolvedText),
        getKeyFactsFromClaude(resolvedText),
        getReflectionQuestionsFromClaude(resolvedText),
      ]);

    const analysis = analyzeText(
      resolvedText,
      url || null,
      summaryFromClaude,
      difficultWordsFromClaude,
      biasAnalysis,
      keyFactsFromClaude,
      reflectionQuestionsFromClaude,
    );

    return NextResponse.json({
      ...analysis,
      articleTitle: articleTitle ?? null,
      url: url ?? null,
    });
  } catch (error) {
    console.error("Error in /api/analyze:", error);
    return NextResponse.json(
      { error: "Unable to analyze article at this time. Please try again." },
      { status: 500 },
    );
  }
}