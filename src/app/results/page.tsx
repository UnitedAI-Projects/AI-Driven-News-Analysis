"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES - OPTION A (User-Friendly Names)
// ═══════════════════════════════════════════════════════════════════════════

type BiasType =
  | "emotional_words"
  | "one_sided"
  | "opinion_as_fact"
  | "missing_proof"
  | "missing_context"
  | "false_equivalence"
  | "cherry_picking"
  | "spin";

type BiasFlag = {
  text: string;
  type: BiasType;
  explanation: string;
  confidence: number;
  severity: "minor" | "moderate" | "major";
  alternative?: string;
  context?: string;
};

type DifficultWordCategory =
  | "Political Terms"
  | "Technical Terms"
  | "Formal Language"
  | "Domain-Specific";

type WordFilter = "All Words" | DifficultWordCategory;

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
  biasFlagged?: BiasFlag[];
  overallAssessment?: string;
  dominantBias?: BiasType;
  keyFacts: string[];
  reflectionQuestions: string[];
  difficultWords: DifficultWord[];
  articleTitle?: string | null;
  url?: string | null;
};

type ComparisonResponse = {
  left: AnalysisResponse;
  right: AnalysisResponse;
  headToHead?: HeadToHeadResponse;
};

type HeadToHeadResponse = {
  moreBiasedArticle: "A" | "B" | "Tie";
  biasDifference: number;
  toneComparison: string;
  uniqueFactsA: string[];
  uniqueFactsB: string[];
  verdict: string;
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const WORD_FILTERS: { id: WordFilter; label: string }[] = [
  { id: "All Words", label: "All Words" },
  { id: "Political Terms", label: "Political Terms" },
  { id: "Technical Terms", label: "Technical Terms" },
  { id: "Formal Language", label: "Formal Language" },
  { id: "Domain-Specific", label: "Domain-Specific" },
];

const categoryColorClasses: Record<DifficultWordCategory, string> = {
  "Political Terms": "bg-blue-100 text-blue-900",
  "Technical Terms": "bg-purple-100 text-purple-900",
  "Formal Language": "bg-amber-100 text-amber-900",
  "Domain-Specific": "bg-pink-100 text-pink-900",
};

// User-friendly bias type colors
const BIAS_BADGE_COLORS: Record<BiasType, string> = {
  emotional_words: "bg-yellow-100 text-yellow-800 border-yellow-300",
  one_sided: "bg-blue-100 text-blue-800 border-blue-300",
  opinion_as_fact: "bg-orange-100 text-orange-800 border-orange-300",
  missing_proof: "bg-red-100 text-red-800 border-red-300",
  missing_context: "bg-purple-100 text-purple-800 border-purple-300",
  false_equivalence: "bg-indigo-100 text-indigo-800 border-indigo-300",
  cherry_picking: "bg-pink-100 text-pink-800 border-pink-300",
  spin: "bg-teal-100 text-teal-800 border-teal-300",
};

// User-friendly labels
const BIAS_TYPE_LABELS: Record<BiasType, string> = {
  emotional_words: "Emotional Words",
  one_sided: "One-Sided",
  opinion_as_fact: "Opinion as Fact",
  missing_proof: "Missing Proof",
  missing_context: "Missing Context",
  false_equivalence: "False Equivalence",
  cherry_picking: "Cherry-Picking",
  spin: "Spin",
};

// Simple descriptions anyone can understand
const BIAS_TYPE_DESCRIPTIONS: Record<BiasType, string> = {
  emotional_words: "Words chosen to make you feel a certain way",
  one_sided: "Only showing one side of the story",
  opinion_as_fact: "Treating personal opinions as proven facts",
  missing_proof: "Making claims without showing evidence",
  missing_context: "Leaving out important information that changes the meaning",
  false_equivalence: "Treating two very different things as if they're the same",
  cherry_picking: "Only mentioning facts that support one view",
  spin: "Using softer or harsher words to change how something sounds",
};

// Category descriptions for tooltips
const CATEGORY_DESCRIPTIONS: Record<DifficultWordCategory, string> = {
  "Political Terms": "Government, policy, diplomacy, and political vocabulary used in news coverage",
  "Technical Terms": "Specialized vocabulary specific to the article's domain (medical, legal, economic, scientific, etc.)",
  "Formal Language": "Academic, professional, or elevated vocabulary used in formal writing",
  "Domain-Specific": "Topic-specific terminology unique to this particular story's subject matter",
};

// Severity colors
const SEVERITY_COLORS: Record<BiasFlag["severity"], string> = {
  minor: "bg-green-50 text-green-700 border-green-200",
  moderate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  major: "bg-red-50 text-red-700 border-red-200",
};

const BASE_REFLECTION_QUESTIONS: string[] = [
  "Who benefits from this framing, and who might be left out?",
  "What would a headline from the 'other side' look like?",
  "Which claims are verified with evidence vs. asserted?",
  "What would you need to read next to form a more complete view?",
];

const SUMMARY_EMPTY_MESSAGE =
  "We could not detect much article text to analyze. Try pasting more of the story, or submit a valid article URL.";
const SUMMARY_FALLBACK_MESSAGE =
  "We couldn't generate a short summary for this article. The bias analysis and other sections below are still based on the text.";

// Confidence helpers
function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return "Very High";
  if (confidence >= 75) return "High";
  if (confidence >= 60) return "Moderate";
  return "Low";
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return "text-green-600";
  if (confidence >= 75) return "text-blue-600";
  if (confidence >= 60) return "text-yellow-600";
  return "text-gray-600";
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function stripMarkdown(text: string): string {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSummary(summary: string): { intro: string; bullets: string[] } {
  const lines = summary.split("\n");
  return {
    intro: lines
      .filter((line) => !line.trim().startsWith("-") && line.trim().length > 0)
      .join(" "),
    bullets: lines
      .filter((line) => line.trim().startsWith("-"))
      .map((line) => line.trim().substring(1).trim()),
  };
}

function coerceStringList(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const cleaned = value.map((item) => stripMarkdown(String(item))).filter(Boolean);
    return cleaned.length ? cleaned : fallback;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map((item) => stripMarkdown(String(item))).filter(Boolean);
        return cleaned.length ? cleaned : fallback;
      }
    } catch {
      // Treat as plaintext list.
    }

    const splitByLine = trimmed
      .split("\n")
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
    return splitByLine.length ? splitByLine : [stripMarkdown(trimmed)];
  }

  return fallback;
}

function normalizeAnalysisResponse(raw: unknown): AnalysisResponse {
  const data = (raw ?? {}) as Partial<AnalysisResponse>;
  const url = typeof data.url === "string" ? data.url : null;
  const trimmedSummary = typeof data.summary === "string" ? data.summary.trim() : "";
  const hasFacts = Array.isArray(data.keyFacts) && data.keyFacts.length > 0;

  let summary = trimmedSummary;
  if (!summary) {
    summary = hasFacts ? SUMMARY_FALLBACK_MESSAGE : SUMMARY_EMPTY_MESSAGE;
    if (url) summary += ` (Source: ${url})`;
  }

  const parsedKeyFacts = coerceStringList(data.keyFacts, ["Could not extract key facts."]);

  return {
    summary: stripMarkdown(summary),
    biasScore: typeof data.biasScore === "number" ? data.biasScore : 75,
    biasFlagged: Array.isArray(data.biasFlagged) ? data.biasFlagged : [],
    overallAssessment: typeof data.overallAssessment === "string" ? data.overallAssessment : undefined,
    dominantBias: data.dominantBias,
    keyFacts: parsedKeyFacts,
    reflectionQuestions:
      coerceStringList(data.reflectionQuestions, BASE_REFLECTION_QUESTIONS),
    difficultWords: Array.isArray(data.difficultWords) ? data.difficultWords : [],
    articleTitle: typeof data.articleTitle === "string" ? data.articleTitle : null,
    url,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function ResultsPageContent() {
  const searchParams = useSearchParams();
  const compareMode = searchParams.get("compare") === "1";
  const [meterWidth, setMeterWidth] = useState(0);
  const [activeFilter, setActiveFilter] = useState<WordFilter>("All Words");
  const [showBiasInfo, setShowBiasInfo] = useState(false);
  const [showAllBias, setShowAllBias] = useState(false);
  const [showCategoryInfo, setShowCategoryInfo] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [headToHead, setHeadToHead] = useState<HeadToHeadResponse | null>(null);
  const [headToHeadLoading, setHeadToHeadLoading] = useState(false);
  const [headToHeadError, setHeadToHeadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (compareMode) {
        const rawComparison = sessionStorage.getItem("newseries-latest-comparison");
        if (!rawComparison) {
          setError("No recent comparison found. Please compare two articles first.");
          setLoading(false);
          return;
        }
        const parsedComparison = JSON.parse(rawComparison) as Record<string, unknown>;
        const leftRaw = parsedComparison.left ?? parsedComparison.articleA;
        const rightRaw = parsedComparison.right ?? parsedComparison.articleB;
        const headToHeadRaw = parsedComparison.headToHead;
        setComparison({
          left: normalizeAnalysisResponse(leftRaw),
          right: normalizeAnalysisResponse(rightRaw),
          headToHead: headToHeadRaw as HeadToHeadResponse | undefined,
        });
        if (headToHeadRaw && typeof headToHeadRaw === "object") {
          setHeadToHead(headToHeadRaw as HeadToHeadResponse);
        }
        setLoading(false);
        return;
      }

      const raw = sessionStorage.getItem("newseries-latest-analysis");
      if (!raw) {
        setError("No recent analysis found. Please analyze an article first.");
        setLoading(false);
        return;
      }
      const parsed = JSON.parse(raw) as AnalysisResponse;
      setAnalysis(parsed);
      const targetScore = parsed.biasScore ?? 65;
      const clamped = Math.min(100, Math.max(0, targetScore));
      const t = requestAnimationFrame(() => {
        setTimeout(() => setMeterWidth(clamped), 100);
      });
      return () => cancelAnimationFrame(t);
    } catch (err) {
      console.error(err);
      setError("There was a problem loading your analysis. Please try again.");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, [compareMode]);

  useEffect(() => {
    if (!compareMode || !comparison) return;
    if (comparison.headToHead) return;

    let isCancelled = false;
    const runHeadToHead = async () => {
      setHeadToHeadLoading(true);
      setHeadToHeadError(null);
      try {
        const response = await fetch("/api/compare", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            articleA: comparison.left,
            articleB: comparison.right,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate head-to-head analysis.");
        }

        const payload = (await response.json()) as HeadToHeadResponse;
        if (!isCancelled) {
          setHeadToHead(payload);
        }
      } catch (err) {
        console.error(err);
        if (!isCancelled) {
          setHeadToHeadError("Unable to generate the head-to-head analysis right now.");
        }
      } finally {
        if (!isCancelled) {
          setHeadToHeadLoading(false);
        }
      }
    };

    runHeadToHead();
    return () => {
      isCancelled = true;
    };
  }, [compareMode, comparison]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-deepBlue">
        {compareMode ? "Comparison Results" : "Analysis Results"}
      </h1>
      <p className="mt-1 text-deepBlue/70">
        {compareMode
          ? "Compare how each article is framed side by side."
          : "Explore how this article is framed and where you might look for additional context."}
      </p>

      {loading && (
        <div className="mt-6 rounded-xl border border-green/20 bg-blueLight/60 p-4 text-deepBlue/80">
          <p>Loading your latest analysis...</p>
        </div>
      )}

      {error && !loading && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p>
          <p className="mt-2">
            Try going back to the{" "}
            <Link href="/#analyze" className="font-semibold text-green underline">
              analyzer
            </Link>{" "}
            and submitting an article again.
          </p>
        </div>
      )}

      {!loading && !error && !compareMode && !analysis && (
        <div className="mt-6 rounded-xl border border-green/20 bg-blueLight/60 p-4 text-deepBlue/80">
          <p>No analysis data found. Please analyze an article first.</p>
        </div>
      )}

      {!loading && !error && compareMode && comparison && (
        <>
          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            {[comparison.left, comparison.right].map((item, index) => {
              const summary = splitSummary(item.summary ?? "");
              const score = Math.min(100, Math.max(0, item.biasScore ?? 75));
              return (
                <article
                  key={index}
                  className="rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/90 p-6 shadow-lg shadow-green/10"
                >
                  <h2 className="font-serif text-xl font-bold text-deepBlue">
                    {index === 0 ? "Article A" : "Article B"}
                  </h2>
                  {item.articleTitle && (
                    <p className="mt-2 text-sm font-semibold text-deepBlue/90">
                      {item.articleTitle}
                    </p>
                  )}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate text-xs text-deepBlue/70 underline hover:text-green"
                    >
                      {item.url}
                    </a>
                  )}

                  <div className="mt-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-deepBlue/70">
                      Summary
                    </h3>
                    {summary.intro && (
                      <p className="mt-2 text-sm leading-relaxed text-deepBlue/90">
                        {summary.intro}
                      </p>
                    )}
                    {summary.bullets.length > 0 && (
                      <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-deepBlue/90">
                        {summary.bullets.map((bullet, bulletIndex) => (
                          <li key={bulletIndex}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-deepBlue/70">
                      Bias Score
                    </h3>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="relative h-6 w-full overflow-hidden rounded-full bg-deepBlue/20">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full"
                          style={{
                            width: `${score}%`,
                            background:
                              score > 70
                                ? "linear-gradient(to right, #ef4444, #f97316)"
                                : score > 40
                                  ? "linear-gradient(to right, #f59e0b, #eab308)"
                                  : "linear-gradient(to right, #10b981, #34d399)",
                          }}
                        />
                      </div>
                      <span className="font-serif text-lg font-bold text-deepBlue">{score}/100</span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-deepBlue/70">
                      Key Facts
                    </h3>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-deepBlue/90">
                      {item.keyFacts.slice(0, 5).map((fact, factIndex) => (
                        <li key={factIndex}>{fact}</li>
                      ))}
                    </ul>
                  </div>

                  {item.dominantBias && (
                    <div className="mt-5 flex items-center gap-2">
                      <span className="text-sm font-medium text-deepBlue/80">Most Common Pattern:</span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          BIAS_BADGE_COLORS[item.dominantBias]
                        }`}
                      >
                        {BIAS_TYPE_LABELS[item.dominantBias]}
                      </span>
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
            <h2 className="font-serif text-2xl font-bold text-white">Head to Head Analysis</h2>
            <p className="mt-2 text-sm text-slate-300">
              A direct comparison of framing, facts, and tone across both articles.
            </p>

            {headToHeadLoading && (
              <p className="mt-4 text-sm text-slate-300">Generating head-to-head comparison...</p>
            )}

            {headToHeadError && !headToHeadLoading && (
              <p className="mt-4 rounded-lg border border-red-400/40 bg-red-900/20 px-4 py-3 text-sm text-red-200">
                {headToHeadError}
              </p>
            )}

            {headToHead && !headToHeadLoading && (
              <div className="mt-5 space-y-5">
                <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Bias Difference</h3>
                  <p className="mt-2 text-base text-white">
                    {headToHead.moreBiasedArticle === "Tie"
                      ? "Both articles appear similarly biased overall."
                      : `Article ${headToHead.moreBiasedArticle} is more biased by about ${headToHead.biasDifference} points.`}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Tone Comparison</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-100">{headToHead.toneComparison}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                      Facts Unique to Article A
                    </h3>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-100">
                      {headToHead.uniqueFactsA.map((fact, idx) => (
                        <li key={idx}>{fact}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                      Facts Unique to Article B
                    </h3>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-100">
                      {headToHead.uniqueFactsB.map((fact, idx) => (
                        <li key={idx}>{fact}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-200">Overall Verdict</h3>
                  <p className="mt-2 text-sm leading-relaxed text-indigo-50">{headToHead.verdict}</p>
                </div>
              </div>
            )}
          </section>

          <div className="mt-10 text-center">
            <Link
              href="/#analyze"
              className="inline-block rounded-full bg-gradient-to-r from-green to-greenLight px-8 py-4 font-semibold text-white shadow-glow-green transition hover:shadow-glow-green-lg"
            >
              Compare More Articles
            </Link>
          </div>
        </>
      )}

      {!loading && !compareMode && analysis && (
        <>
          {/* Summary */}
          <section className="mt-8 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/90 p-6 shadow-lg shadow-green/10 transition hover:shadow-glow-green">
            <h2 className="font-serif text-xl font-bold text-deepBlue">Summary</h2>
    
            {/* Add introductory paragraph */}
            <p className="mt-3 text-deepBlue/90 leading-relaxed">
              {analysis.summary
                .split('\n')
                .filter(line => !line.trim().startsWith('-') && line.trim().length > 0)
                .join(' ')}
            </p>
    
            {/* Render bullet points */}
            <ul className="mt-4 space-y-2">
              {analysis.summary
                .split('\n')
                .filter(line => line.trim().startsWith('-'))
                .map((line, i) => (
                  <li key={i} className="flex gap-2 text-deepBlue/90 leading-relaxed">
                    <span className="text-green font-bold">•</span>
                    <span>{line.trim().substring(1).trim()}</span>
                  </li>
                ))}
            </ul>

            {/* Source link if available */}
            {analysis.url && (
              <p className="mt-4 text-xs text-deepBlue/60">
                Source:{" "}
                <a href={analysis.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-green">
                  {analysis.url} 
                </a>
              </p>
            )}
          </section>

          {/* Key Facts */}
          <section className="mt-8 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/80 p-6 shadow-lg shadow-green/10">
            <h2 className="font-serif text-xl font-bold text-deepBlue">
              Key Facts
            </h2>
            <ul className="mt-4 list-inside list-disc space-y-2 text-deepBlue/90">
              {analysis.keyFacts.map((fact, i) => (
                <li key={i}>{fact}</li>
              ))}
            </ul>
          </section>

          {/* Bias Meter */}
          <section className="mt-8 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/80 p-6 shadow-lg shadow-green/10">
            <h2 className="font-serif text-xl font-bold text-deepBlue">
              Bias meter
            </h2>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative h-8 w-full max-w-xs overflow-hidden rounded-full bg-deepBlue/20">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${meterWidth}%`,
                    background: meterWidth > 70 
                      ? 'linear-gradient(to right, #ef4444, #f97316)' 
                      : meterWidth > 40 
                      ? 'linear-gradient(to right, #f59e0b, #eab308)' 
                      : 'linear-gradient(to right, #10b981, #34d399)'
                  }}
                />
              </div>
              <span className="font-serif text-2xl font-bold text-deepBlue">
                {analysis.biasScore}/100
              </span>
            </div>
            <p className="mt-1 text-sm text-deepBlue/70">
              Higher score = more biased; lower score = more neutral.
            </p>

            {/* Overall Assessment */}
            {analysis.overallAssessment && (
              <div className="mt-4 rounded-lg border border-deepBlue/10 bg-white/50 p-4">
                <p className="text-sm font-medium text-deepBlue">
                  Overall Assessment:
                </p>
                <p className="mt-1 text-sm text-deepBlue/80">
                  {analysis.overallAssessment}
                </p>
              </div>
            )}

            {/* Dominant Bias Type */}
            {analysis.dominantBias && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm font-medium text-deepBlue">
                  Most Common Pattern:
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                    BIAS_BADGE_COLORS[analysis.dominantBias as BiasType]
                  }`}
                >
                  {BIAS_TYPE_LABELS[analysis.dominantBias as BiasType]}
                </span>
              </div>
            )}
          </section>

          {/* Bias Detected */}
          {analysis.biasFlagged && analysis.biasFlagged.length > 0 && (
            <section className="mt-8 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/90 p-6 shadow-lg shadow-green/10">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl font-bold text-deepBlue">
                  Bias Detected
                </h2>
                <button
                  type="button"
                  onClick={() => setShowBiasInfo(!showBiasInfo)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-deepBlue/10 text-deepBlue hover:bg-deepBlue/20 transition"
                  aria-label="Learn about bias types"
                >
                  <span className="text-sm font-bold">?</span>
                </button>
              </div>

              {/* Tooltip */}
              {showBiasInfo && (
                <div className="mt-4 rounded-lg border-2 border-deepBlue/20 bg-white/90 p-4 shadow-lg">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-deepBlue">Understanding Bias Types</h3>
                    <button
                      onClick={() => setShowBiasInfo(false)}
                      className="text-deepBlue/60 hover:text-deepBlue text-lg font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-sm text-deepBlue/80 mb-3">
                    We look for 8 common patterns of bias in news articles:
                  </p>
                  <div className="grid gap-2 text-sm">
                    {Object.entries(BIAS_TYPE_LABELS).map(([type, label]) => (
                      <div key={type} className="flex gap-2">
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${BIAS_BADGE_COLORS[type as BiasType]}`}>
                          {label}
                        </span>
                        <span className="text-xs text-deepBlue/70">
                          {BIAS_TYPE_DESCRIPTIONS[type as BiasType]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-4 text-sm text-deepBlue/70">
                These words or phrases were flagged as potentially biased.
              </p>

              {/* Flagged Items */}
              <ul className="mt-6 space-y-4">
                {(showAllBias ? analysis.biasFlagged : analysis.biasFlagged.slice(0, 3)).map((flag, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-green/10 bg-white/70 p-5 shadow-sm"
                  >
                    {/* Header with quoted text and badges */}
                    <div className="flex flex-wrap items-start gap-2">
                      <span className="flex-1 rounded-md bg-deepBlue/10 px-3 py-2 font-semibold text-deepBlue text-sm">
                        "{flag.text}"
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            BIAS_BADGE_COLORS[flag.type]
                          }`}
                        >
                          {BIAS_TYPE_LABELS[flag.type]}
                        </span>
                        {/* Severity Badge */}
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            SEVERITY_COLORS[flag.severity]
                          }`}
                        >
                          {flag.severity.charAt(0).toUpperCase() +
                            flag.severity.slice(1)}
                        </span>
                      </div>
                    </div>

                    {/* Explanation */}
                    <p className="mt-3 text-sm text-deepBlue/80">
                      {flag.explanation}
                    </p>

                    {/* Alternative Phrasing */}
                    {flag.alternative && (
                      <div className="mt-3 rounded-lg border border-green/20 bg-greenBg/30 p-3">
                        <p className="text-xs font-semibold text-green">
                          💡 More neutral alternative:
                        </p>
                        <p className="mt-1 text-sm text-deepBlue">
                          {flag.alternative}
                        </p>
                      </div>
                    )}

                    {/* Confidence & Severity Info */}
                    <div className="mt-3 flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-deepBlue/60">Confidence:</span>
                        <span
                          className={`font-semibold ${getConfidenceColor(
                            flag.confidence
                          )}`}
                        >
                          {getConfidenceLabel(flag.confidence)} ({flag.confidence}%)
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* See More/Less Button */}
              {analysis.biasFlagged.length > 3 && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllBias(!showAllBias)}
                    className="rounded-full border-2 border-green bg-white px-6 py-2 text-sm font-semibold text-deepBlue transition hover:bg-green/10"
                  >
                    {showAllBias ? '⬆ See Less' : `⬇ See More (${analysis.biasFlagged.length - 3} more)`}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Think About It */}
          <section className="mt-8 rounded-xl border-2 border-green/40 bg-greenBg/80 p-6 shadow-glow-green">
            <h2 className="font-serif text-xl font-bold text-deepBlue">
              Think About It
            </h2>
            <p className="mt-2 text-deepBlue/80">
              Use these questions to reflect on what you read and how it was
              presented.
            </p>
            <ul className="mt-4 space-y-2">
              {analysis.reflectionQuestions.map((q, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-green font-medium">{i + 1}.</span>
                  <span className="text-deepBlue/90">{q}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Difficult Words */}
          <section className="mt-10 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/80 p-6 shadow-lg shadow-green/10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-xl font-bold text-deepBlue">
                    Difficult Words in This Article
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowCategoryInfo(!showCategoryInfo)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-deepBlue/10 text-deepBlue hover:bg-deepBlue/20 transition"
                    aria-label="Learn about word categories"
                  >
                    <span className="text-sm font-bold">?</span>
                  </button>
                </div>

                {/* Category Tooltip */}
                {showCategoryInfo && (
                  <div className="mt-3 rounded-lg border-2 border-deepBlue/20 bg-white/90 p-4 shadow-lg">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-deepBlue">Understanding Word Categories</h3>
                      <button
                        onClick={() => setShowCategoryInfo(false)}
                        className="text-deepBlue/60 hover:text-deepBlue text-lg font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid gap-2 text-sm">
                      {Object.entries(CATEGORY_DESCRIPTIONS).map(([category, description]) => (
                        <div key={category} className="flex gap-2">
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${categoryColorClasses[category as DifficultWordCategory]}`}>
                            {category}
                          </span>
                          <span className="text-xs text-deepBlue/70">
                            {description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="mt-1 text-sm text-deepBlue/80">
                  Learn key vocabulary from this article with simple meanings,
                  pronunciation, and examples.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {WORD_FILTERS.map((filter) => {
                  const isActive = activeFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setActiveFilter(filter.id)}
                      className={
                        "rounded-full px-3 py-1 text-sm font-medium border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green " +
                        (isActive
                          ? "border-green bg-gradient-to-r from-green to-greenLight text-white shadow-glow-green"
                          : "border-deepBlue/10 bg-white/60 text-deepBlue/80 hover:border-green/60 hover:text-deepBlue")
                      }
                      aria-pressed={isActive}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {(activeFilter === "All Words"
                ? analysis.difficultWords
                : analysis.difficultWords.filter(
                    (word) => word.category === activeFilter
                  )
              ).map((word) => (
                <article
                  key={word.word}
                  className="flex h-full flex-col rounded-xl border border-green/20 bg-white/70 p-4 shadow-sm"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold text-deepBlue">
                      {word.word}
                    </h3>
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold " +
                        categoryColorClasses[word.category]
                      }
                    >
                      {word.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-wide text-deepBlue/60">
                    Pronunciation:{" "}
                    <span className="font-semibold text-deepBlue/80">
                      {word.pronunciation}
                    </span>
                  </p>
                  <p className="mt-3 text-[15px] leading-relaxed text-deepBlue/90">
                    {word.definition}
                  </p>
                  <p className="mt-3 text-sm text-deepBlue/80">
                    <span className="font-semibold text-deepBlue">
                      Example:
                    </span>{" "}
                    {word.example}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <div className="mt-10 text-center">
            <Link
              href="/#analyze"
              className="inline-block rounded-full bg-gradient-to-r from-green to-greenLight px-8 py-4 font-semibold text-white shadow-glow-green transition hover:shadow-glow-green-lg"
            >
              Analyze Another
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] bg-blueLight" />}>
      <ResultsPageContent />
    </Suspense>
  );
}
