import Anthropic from "@anthropic-ai/sdk";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function looksLikeUrl(s: string): boolean {
  const t = s.trim();
  return /^https?:\/\/[^\s]+$/i.test(t);
}

async function fetchArticleTextFromUrl(url: string): Promise<{ text: string; title?: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; NewSeries/1.0; +https://github.com/newseries)",
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  if (!article?.textContent?.trim()) {
    const body = dom.window.document.body?.textContent?.trim() ?? "";
    return { text: body.slice(0, 100000), title: undefined };
  }
  const title = article.title ? `${article.title}\n\n` : "";
  return { text: title + article.textContent.trim(), title: article.title ?? undefined };
}

type BiasSignal = {
  title: string;
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
  keyFacts: string[];
  reflectionQuestions: string[];
  difficultWords: DifficultWord[];
};

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
    definition:
      "A feeling or opinion that makes you support one side more than another, even when you should be fair.",
    example: "The article shows bias because it mostly supports one point of view.",
    category: "Commonly Confused",
  },
  {
    word: "take effect",
    pronunciation: "tayk eh-FEKT",
    definition: "To start working or to begin to have a result.",
    example: "The new policy will take effect next month.",
    category: "Idioms",
  },
  {
    word: "rely on",
    pronunciation: "ri-LY on",
    definition: "To depend on someone or something to do what you need.",
    example: "The article seems to rely on only one main source.",
    category: "Phrasal Verbs",
  },
  {
    word: "leave out",
    pronunciation: "leev owt",
    definition: "To not include something or someone.",
    example: "The writer leaves out important background information.",
    category: "Phrasal Verbs",
  },
  {
    word: "read (past: read)",
    pronunciation: "reed (past: red)",
    definition:
      "To look at and understand written words. In the past tense, the spelling stays the same but the sound changes.",
    example: "You may have read only one article, but you can look for more sources.",
    category: "Irregular Verbs",
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const SUMMARY_SYSTEM_PROMPT = `You are a concise news summarizer. Your only job is to write a short, factual summary of what the article is about.

Write a plain one-minute summary: what the article is about (the topic), key events, and people or groups involved. Write like a quick news summary a journalist would write — describing what happened in the article. Use neutral, factual language. Do NOT discuss bias, framing, or how the story is presented; those are handled elsewhere. Keep it to 2–4 short paragraphs.`;

async function getSummaryFromClaude(articleText: string): Promise<string | null> {
  if (!ANTHROPIC || !articleText.trim()) return null;
  const truncated =
    articleText.length > 120000 ? articleText.slice(0, 120000) + "\n\n[Article truncated.]" : articleText;
  try {
    const msg = await ANTHROPIC.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Summarize this article in a plain one-minute news summary (topic, key events, people involved). Do not discuss bias or framing.\n\n---\n\n${truncated}`,
        },
      ],
    });
    const block = msg.content.find((b) => b.type === "text");
    return block && "text" in block ? block.text.trim() : null;
  } catch {
    return null;
  }
}

function analyzeText(
  rawText: string,
  url?: string | null,
  summaryOverride?: string | null,
): AnalysisResponse {
  const text = rawText.trim();

  // Basic stats
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const estimatedReadMinutes = wordCount > 0 ? Math.max(1, Math.round(wordCount / 200)) : 0;

  const hasLoadedLanguage = /slam(?:s|med)?|blast(?:s|ed)?|disaster|outrage|furious/i.test(text);
  const hasSingleSourceFraming = /according to|officials say|experts say|sources say/i.test(text);
  const hasEmotionalFraming = /shocking|terrifying|heartbreaking|outrageous|furious|furiously/i.test(
    text,
  );
  const hasOmissionHints = /however|critics say|supporters say|on the other hand/i.test(text);

  let biasScore = 80;
  const signals: BiasSignal[] = [];

  if (hasLoadedLanguage) {
    biasScore -= 10;
    signals.push({
      title: "Loaded language",
      explanation:
        "The article uses emotionally charged verbs or adjectives (for example, 'slams' or 'blasted') that can push readers toward a reaction instead of neutrally reporting events.",
    });
  }

  if (hasSingleSourceFraming) {
    biasScore -= 10;
    signals.push({
      title: "Single-source framing",
      explanation:
        "Much of the piece appears to rest on a small number of official or expert sources, which can narrow the range of perspectives presented.",
    });
  }

  if (hasEmotionalFraming) {
    biasScore -= 10;
    signals.push({
      title: "Emotional framing",
      explanation:
        "The article leans on emotional words (for example, 'shocking', 'terrifying', or 'outrageous') that can heighten fear or urgency instead of letting evidence speak for itself.",
    });
  }

  if (!hasOmissionHints) {
    biasScore -= 5;
    signals.push({
      title: "Possible omission of context",
      explanation:
        "It is not always clear how this story fits into a larger timeline or set of perspectives, which can make it harder to see what might be missing.",
    });
  }

  biasScore = clamp(biasScore, 20, 95);

  const keyFacts: string[] = [];

  if (wordCount > 0) {
    keyFacts.push(
      `The article is approximately ${wordCount.toLocaleString()} words long, or about ${estimatedReadMinutes} minute${
        estimatedReadMinutes === 1 ? "" : "s"
      } of reading.`,
    );
  }

  const numberMatches = text.match(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g);
  if (numberMatches && numberMatches.length > 0) {
    keyFacts.push(
      `We detected numerical claims such as ${[...new Set(numberMatches)].slice(0, 3).join(
        ", ",
      )}. Check how these figures were produced and whether they are presented with enough context.`,
    );
  }

  const yearMatches = text.match(/\b(19|20)\d{2}\b/g);
  if (yearMatches && yearMatches.length > 0) {
    keyFacts.push(
      `The article references specific years (${[...new Set(yearMatches)].slice(0, 3).join(
        ", ",
      )}), which can be helpful for tracing timelines and comparing with other sources.`,
    );
  }

  if (!keyFacts.length) {
    keyFacts.push(
      "The article includes claims that can likely be cross-checked against official records, primary documents, or reporting from outlets with different editorial perspectives.",
    );
  }

  const reflectionQuestions = BASE_REFLECTION_QUESTIONS;

  let summary: string;
  if (summaryOverride?.trim()) {
    summary = summaryOverride.trim();
    if (url) summary += `\n\n(Source: ${url})`;
  } else if (wordCount === 0) {
    summary =
      "We could not detect much article text to analyze. Try pasting more of the story, including the headline and a few key paragraphs, or submit a valid article URL.";
  } else {
    summary =
      "We couldn't generate a short summary for this article. The bias analysis and other sections below are still based on the text.";
    if (url) summary += ` (Source: ${url})`;
  }

  return {
    summary,
    biasScore,
    biasSignals: signals.length
      ? signals
      : [
          {
            title: "No strong bias patterns detected",
            explanation:
              "We did not detect strong signs of loaded language or one-sided sourcing. Still, it is helpful to compare this coverage with at least one outlet that has a different editorial perspective.",
          },
        ],
    keyFacts,
    reflectionQuestions,
    difficultWords: BASE_DIFFICULT_WORDS,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let articleText =
      (typeof body?.articleText === "string" ? body.articleText : "") ||
      (typeof body?.text === "string" ? body.text : "");
    let url = typeof body?.url === "string" ? body.url : null;

    if (articleText?.trim() && looksLikeUrl(articleText.trim())) {
      const toFetch = articleText.trim();
      try {
        const { text } = await fetchArticleTextFromUrl(toFetch);
        articleText = text;
        url = url || toFetch;
      } catch (err) {
        console.error("Error fetching URL:", err);
        return NextResponse.json(
          { error: "Could not fetch or extract article from that URL. Try pasting the article text instead." },
          { status: 400 },
        );
      }
    } else if ((!articleText || !articleText.trim()) && url?.trim() && looksLikeUrl(url.trim())) {
      try {
        const { text } = await fetchArticleTextFromUrl(url.trim());
        articleText = text;
      } catch (err) {
        console.error("Error fetching URL:", err);
        return NextResponse.json(
          { error: "Could not fetch or extract article from that URL. Try pasting the article text instead." },
          { status: 400 },
        );
      }
    }

    const resolvedText = articleText?.trim() ?? "";
    const summaryFromClaude = await getSummaryFromClaude(resolvedText);
    const analysis = analyzeText(resolvedText, url || null, summaryFromClaude);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Error in /api/analyze:", error);
    return NextResponse.json(
      {
        error: "Unable to analyze article at this time. Please try again.",
      },
      { status: 500 },
    );
  }
}

