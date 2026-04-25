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
  // Try Firecrawl first
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      const FirecrawlApp = (await import("@mendable/firecrawl-js")).default;
      const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
      const result = await firecrawl.scrape(url, { formats: ["markdown"] });
      if (result && result.markdown) {
        return {
          text: result.markdown.slice(0, 100000),
          title: result.metadata?.title ?? undefined,
        };
      }
    } catch (err) {
      console.log("Firecrawl failed, falling back to direct fetch:", err);
    }
  }

  // Fallback to direct fetch
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
  type: "emotional_words" | "one_sided" | "opinion_as_fact" | "missing_proof" | "missing_context" | "false_equivalence" | "cherry_picking" | "spin";
  explanation: string;
  confidence: number; // 
  severity: "minor" | "moderate" | "major";
  alternative?: string;
  context?: string;
};

type DifficultWordCategory = "Political Terms" | "Technical Terms" | "Formal Language" | "Domain-Specific";

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
  overallAssessment?: string;
  dominantBias?: string;
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
    definition: "A tendency to favor one perspective over another, often unconsciously.",
    example: "The article shows bias by only quoting sources from one political party.",
    category: "Political Terms",
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
      system: `You are a concise news summarizer. Create a summary with TWO parts:

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
3. Then add bullet points (each starting with "-")

## EXAMPLE OUTPUT:
The Iran-U.S. conflict has effectively shut down commercial shipping through the Strait of Hormuz, creating a global shipping crisis. Companies are now paying unprecedented premiums to secure alternative routes through the Panama Canal.

- Companies are paying up to $4 million for last-minute Panama Canal crossing slots as the conflict has disrupted normal shipping routes
- The Panama Canal normally charges $300,000-$400,000 per crossing, but prices have surged to approximately $425,000
- One unnamed fuel company paid an extra $4 million to reroute its vessel from Europe to Singapore
- Brent crude oil prices briefly exceeded $107 per barrel this week, up from approximately $66 a year ago`,
      messages: [{ role: "user", content: `Summarize this article:\n\n${truncated}` }],
    });
    const block = msg.content.find((b) => b.type === "text");
    return block && "text" in block ? block.text.trim() : null;
  } catch (e) {
    console.log("Summary error:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE REPLACEMENT FUNCTION - Copy and paste this entire function
// Replace your existing getBiasAnalysisFromClaude with this
// ═══════════════════════════════════════════════════════════════════════════

async function getBiasAnalysisFromClaude(
  articleText: string
): Promise<{ score: number; flagged: BiasFlag[]; overallAssessment: string; dominantBias?: string }> {
  if (!ANTHROPIC || !articleText.trim()) {
    return { score: 75, flagged: [], overallAssessment: "Unable to analyze bias without article text." };
  }

  const truncated = articleText.length > 120000 ? articleText.slice(0, 120000) : articleText;

  try {
    const msg = await ANTHROPIC.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      system: `You are an expert media bias analyst. Your job is to identify bias in news articles with precision and nuance.

## YOUR TASK:
Analyze the article for bias and identify the TOP 5-8 most significant instances of biased language, framing, or omissions.

## BIAS CATEGORIES (USE THESE EXACT NAMES):
1. **emotional_words** - Words chosen to make readers feel a certain way rather than inform objectively
   Examples: "regime" vs "government", "invasion" vs "operation", "slammed" vs "criticized"

2. **one_sided** - Presenting facts in a way that only shows one perspective; slanted presentation
   Examples: Only quoting sources from one side, emphasizing facts that support one view

3. **opinion_as_fact** - Stating subjective opinions or interpretations as if they are objective truths
   Examples: "This policy is clearly harmful" (opinion) vs "Critics argue this policy is harmful" (fact)

4. **missing_proof** - Making statements as facts without providing evidence or sources
   Examples: "Many people believe...", "It's widely known that..." without citations

5. **missing_context** - Leaving out key perspectives, background, or counterpoints that provide balance
   Examples: Reporting a statistic without comparison data, omitting opposing viewpoints

6. **false_equivalence** - Giving equal weight or treatment to claims of vastly different validity or credibility
   Examples: Treating scientific consensus and fringe theory as equally valid

7. **cherry_picking** - Selectively choosing facts, quotes, or data points that support a narrative while ignoring others
   Examples: Citing only favorable statistics, using quotes out of context

8. **spin** - Using softer language (euphemism) or harsher language (dysphemism) to influence perception
   Examples: "enhanced interrogation" vs "torture", "collateral damage" vs "civilian deaths"

## FOR EACH FLAGGED ITEM, PROVIDE:
- **text**: The exact word, phrase, or short quote from the article (keep under 15 words)
- **type**: One of the 8 categories above (use exact names: emotional_words, one_sided, opinion_as_fact, missing_proof, missing_context, false_equivalence, cherry_picking, spin)
- **explanation**: A clear, specific explanation of WHY this is biased (1-2 sentences)
- **confidence**: Your confidence level (50-100 scale):
  - 90-100 = Very obvious bias, clear case
  - 75-89 = Strong evidence of bias
  - 60-74 = Moderate evidence, some interpretation needed
  - 50-59 = Subtle bias, could be debated
- **severity**: Impact level of this bias:
  - "minor" = Slight lean, minor word choice issue
  - "moderate" = Notable slant, affects interpretation
  - "major" = Significant distortion, fundamentally shapes narrative
- **alternative**: (OPTIONAL) Suggest a more neutral way to phrase this (1 short sentence)

## OVERALL ANALYSIS:
- **score**: 0-100 neutrality score (100 = perfectly neutral, 0 = extremely biased)
  - 80-100: Mostly neutral with minor issues
  - 60-79: Noticeable bias but still informative
  - 40-59: Significant bias, strong narrative push
  - 0-39: Extreme bias, propaganda-like
- **overallAssessment**: 2-3 sentence summary of the article's bias patterns
- **dominantBias**: The most frequent bias type in this article (if clear pattern exists)

## CRITICAL INSTRUCTIONS:
- Be specific - flag actual words/phrases from the article, not generic patterns
- Focus on the MOST significant instances - quality over quantity
- Use ONLY the 8 category names provided above
- Be fair - don't over-flag neutral journalism

## OUTPUT FORMAT:
Return ONLY valid JSON with no markdown formatting:

{
  "score": <number 0-100>,
  "overallAssessment": "<string>",
  "dominantBias": "<bias_type or null>",
  "flagged": [
    {
      "text": "<exact quote from article>",
      "type": "<bias_type>",
      "explanation": "<why this is biased>",
      "confidence": <number 50-100>,
      "severity": "<minor|moderate|major>",
      "alternative": "<optional neutral phrasing>"
    }
  ]
}`,
      messages: [{ role: "user", content: `Analyze bias in this article:\n\n${truncated}` }],
    });

    const block = msg.content.find((b) => b.type === "text");
    if (!block || !("text" in block)) {
      console.log("Bias: no text block found");
      return { score: 75, flagged: [], overallAssessment: "Unable to complete bias analysis." };
    }

    console.log("Bias raw response:", block.text.slice(0, 500));

    const parsed = parseJSON(block.text);

    // Validate and set defaults
    const score = typeof parsed.score === "number" ? parsed.score : 75;
    const overallAssessment =
      typeof parsed.overallAssessment === "string"
        ? parsed.overallAssessment
        : "Bias analysis completed.";
    const dominantBias = parsed.dominantBias || undefined;

    // Validate flagged items with new fields
    const flagged = Array.isArray(parsed.flagged)
      ? parsed.flagged
          .filter((item: any) => {
            return (
              item &&
              typeof item.text === "string" &&
              typeof item.type === "string" &&
              typeof item.explanation === "string"
            );
          })
          .map((item: any) => ({
            text: item.text,
            type: item.type,
            explanation: item.explanation,
            confidence: typeof item.confidence === "number" ? item.confidence : 75,
            severity:
              item.severity === "minor" ||
              item.severity === "moderate" ||
              item.severity === "major"
                ? item.severity
                : "moderate",
            alternative:
              typeof item.alternative === "string" ? item.alternative : undefined,
            context: typeof item.context === "string" ? item.context : undefined,
          }))
      : [];

    console.log(`Bias analysis: score=${score}, flagged=${flagged.length} items`);

    // Reverse the score so higher = more biased
    const reversedScore = 100 - score;

    return {
      score: reversedScore,
      flagged,
      overallAssessment,
      dominantBias,
    };
  } catch (e) {
    console.error("Bias analysis error:", e);
    return {
      score: 75,
      flagged: [],
      overallAssessment: "Error analyzing bias. Please try again.",
    };
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
      system: `You are a critical thinking educator for high school students. Generate exactly 4 SHORT, simple questions about this article. 

      REQUIREMENTS:
      - Each question should be 10-15 words maximum
      - Use simple, everyday language (avoid academic jargon)
      - Ask questions that make readers think critically but aren't overwhelming
      - Reference specific details from the article when possible
      - Focus on: who benefits, what's missing, source credibility, and alternative perspectives

      GOOD EXAMPLES:
      - "Who might benefit from this story being told this way?"
      - "What viewpoints are missing from this article?"
      - "Are all the claims backed up with evidence?"
      - "How might the 'other side' describe this situation?"

      BAD EXAMPLES (too long/complex):
      - "Canal Administrator Ricaurte Vásquez revealed that one unnamed fuel vessel paid an extra $4 million to reroute to Singapore because 'Singapore is running out of fuel' — what does this suggest about how regional fuel crises can create cascading economic pressure points that force companies into extraordinarily costly last-minute decisions?"

Return ONLY a JSON array of 4 strings with no markdown formatting.`,

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
      system: `You are an ESL vocabulary assistant specializing in news comprehension. Find 5-7 challenging words or phrases from this article that would help ESL learners understand news content.

## CATEGORIES (USE THESE EXACT NAMES):

1. **Political Terms** - Government, policy, diplomacy, and political vocabulary
   Examples: sanctions, bilateral, ceasefire, ambassador, regime, negotiator, delegation, envoy

2. **Technical Terms** - Specialized vocabulary specific to the article's domain (military, medical, economic, scientific, legal, etc.)
   Examples: enriched uranium, maritime, blockade, naval, infrastructure, forensic, probation

3. **Formal Language** - Academic, professional, or elevated vocabulary used in formal writing
   Examples: commenced, pursuant, entities, attributed, substantial, facilitate, acknowledged

4. **Domain-Specific** - Topic-specific terminology unique to this particular story's subject matter
   Examples: varies by article - could be medical terms for health stories, tech jargon for tech stories, legal terms for court stories

## INSTRUCTIONS:
- Select words/phrases that ESL learners would genuinely struggle with
- Don't include common everyday words (like "said", "went", "people")
- Prioritize words that are key to understanding the article's main points
- Try to distribute across categories when possible, but it's OK if some have more than others
- Every word MUST actually appear in the article text

## OUTPUT FORMAT:
Return ONLY a JSON array with no markdown formatting:

[
  {
    "word": "<word or phrase>",
    "pronunciation": "<phonetic pronunciation>",
    "definition": "<simple, clear definition>",
    "example": "<example sentence using the word>",
    "category": "Political Terms" | "Technical Terms" | "Formal Language" | "Domain-Specific"
  }
]`,
      messages: [{ role: "user", content: `Find difficult vocabulary in this article:\n\n${truncated}` }],
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
  biasOverride?: { score: number; flagged: BiasFlag[]; overallAssessment?: string; dominantBias?: string },
  keyFactsOverride?: string[],
  reflectionQuestionsOverride?: string[],
): AnalysisResponse {
  const text = rawText.trim();
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const biasScore = biasOverride?.score ?? 75;
  const biasFlagged = biasOverride?.flagged ?? [];
  const overallAssessment = biasOverride?.overallAssessment;
  const dominantBias = biasOverride?.dominantBias;
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
    overallAssessment,
    dominantBias,
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
    console.log("Firecrawl key present:", !!process.env.FIRECRAWL_API_KEY);

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