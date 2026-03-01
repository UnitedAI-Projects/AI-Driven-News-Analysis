"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

type BiasSignal = {
  title: string;
  explanation: string;
};

type BiasFlag = {
  text: string;
  type: "loaded_language" | "opinion_as_fact" | "unverified_claim" | "framing_bias";
  explanation: string;
};

type DifficultWordCategory = "Commonly Confused" | "Irregular Verbs" | "Phrasal Verbs" | "Idioms";

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
  biasSignals: BiasSignal[];
  biasFlagged?: BiasFlag[];
  keyFacts: string[];
  reflectionQuestions: string[];
  difficultWords: DifficultWord[];
  articleTitle?: string | null;
  url?: string | null;
};

const WORD_FILTERS: { id: WordFilter; label: string }[] = [
  { id: "All Words", label: "All Words" },
  { id: "Commonly Confused", label: "Commonly Confused" },
  { id: "Irregular Verbs", label: "Irregular Verbs" },
  { id: "Phrasal Verbs", label: "Phrasal Verbs" },
  { id: "Idioms", label: "Idioms" },
];

const categoryColorClasses: Record<DifficultWordCategory, string> = {
  "Commonly Confused": "bg-blue-100 text-blue-900",
  "Irregular Verbs": "bg-purple-100 text-purple-900",
  "Phrasal Verbs": "bg-amber-100 text-amber-900",
  Idioms: "bg-pink-100 text-pink-900",
};

const biasBadgeColors: Record<BiasFlag["type"], string> = {
  loaded_language: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  opinion_as_fact: "bg-orange-100 text-orange-800 border border-orange-300",
  unverified_claim: "bg-red-100 text-red-800 border border-red-300",
  framing_bias: "bg-blue-100 text-blue-800 border border-blue-300",
};

const biasTypeLabels: Record<BiasFlag["type"], string> = {
  loaded_language: "Loaded Language",
  opinion_as_fact: "Opinion as Fact",
  unverified_claim: "Unverified Claim",
  framing_bias: "Framing Bias",
};

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

export default function ResultsPage() {
  const [meterWidth, setMeterWidth] = useState(0);
  const [activeFilter, setActiveFilter] = useState<WordFilter>("All Words");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
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
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-deepBlue">Analysis Results</h1>
      <p className="mt-1 text-deepBlue/70">
        Explore how this article is framed and where you might look for additional context.
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

      {!loading && !error && !analysis && (
        <div className="mt-6 rounded-xl border border-green/20 bg-blueLight/60 p-4 text-deepBlue/80">
          <p>No analysis data found. Please analyze an article first.</p>
        </div>
      )}

      {!loading && analysis && (
        <>
          {/* Summary */}
          <section className="mt-8 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/90 p-6 shadow-lg shadow-green/10 transition hover:shadow-glow-green">
            <h2 className="font-serif text-xl font-bold text-deepBlue">Summary</h2>
            <p className="mt-3 text-deepBlue/90 leading-relaxed">{stripMarkdown(analysis.summary)}</p>
          </section>

          {/* Bias Meter */}
          <section className="mt-8 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/80 p-6 shadow-lg shadow-green/10">
            <h2 className="font-serif text-xl font-bold text-deepBlue">Bias meter</h2>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative h-8 w-full max-w-xs overflow-hidden rounded-full bg-deepBlue/20">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-green to-greenLight shadow-glow-green transition-all duration-1000 ease-out"
                  style={{ width: `${meterWidth}%` }}
                />
              </div>
              <span className="font-serif text-2xl font-bold text-deepBlue">
                {analysis.biasScore}/100
              </span>
            </div>
            <p className="mt-1 text-sm text-deepBlue/70">
              Higher score = more neutral; lower = more biased.
            </p>
          </section>

          {/* Bias Flagged Words */}
          {analysis.biasFlagged && analysis.biasFlagged.length > 0 && (
            <section className="mt-8 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/90 p-6 shadow-lg shadow-green/10">
              <h2 className="font-serif text-xl font-bold text-deepBlue">Bias Detected</h2>
              <p className="mt-1 text-sm text-deepBlue/70">
                These words or phrases were flagged as potentially biased.
              </p>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-green/10 bg-white/60 px-3 py-2">
                  <span className="rounded-full border border-yellow-300 bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
                    Loaded Language
                  </span>
                  <span className="text-xs text-deepBlue/70">Emotionally charged words to provoke a reaction</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-green/10 bg-white/60 px-3 py-2">
                  <span className="rounded-full border border-blue-300 bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                    Framing Bias
                  </span>
                  <span className="text-xs text-deepBlue/70">Facts presented in a slanted or one-sided way</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-green/10 bg-white/60 px-3 py-2">
                  <span className="rounded-full border border-orange-300 bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
                    Opinion as Fact
                  </span>
                  <span className="text-xs text-deepBlue/70">Personal opinions stated as verified truths</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-green/10 bg-white/60 px-3 py-2">
                  <span className="rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                    Unverified Claim
                  </span>
                  <span className="text-xs text-deepBlue/70">Statements presented as true without evidence</span>
                </div>
              </div>

              {/* Flagged items */}
              <ul className="mt-4 space-y-3">
                {analysis.biasFlagged.map((flag, i) => (
                  <li key={i} className="rounded-xl border border-green/10 bg-white/70 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-deepBlue/10 px-2 py-1 font-semibold text-deepBlue text-sm">
                        "{flag.text}"
                      </span>
                      <span className={"rounded-full px-2.5 py-0.5 text-xs font-semibold " + biasBadgeColors[flag.type]}>
                        {biasTypeLabels[flag.type]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-deepBlue/80">{flag.explanation}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Key Facts */}
          <section className="mt-8 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/80 p-6 shadow-lg shadow-green/10">
            <h2 className="font-serif text-xl font-bold text-deepBlue">Key facts</h2>
            <ul className="mt-4 list-inside list-disc space-y-2 text-deepBlue/90">
              {analysis.keyFacts.map((fact, i) => (
                <li key={i}>{fact}</li>
              ))}
            </ul>
          </section>

          {/* Think About It */}
          <section className="mt-8 rounded-xl border-2 border-green/40 bg-greenBg/80 p-6 shadow-glow-green">
            <h2 className="font-serif text-xl font-bold text-deepBlue">Think About It</h2>
            <p className="mt-2 text-deepBlue/80">
              Use these questions to reflect on what you read and how it was presented.
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
                <h2 className="font-serif text-xl font-bold text-deepBlue">Difficult Words in This Article</h2>
                <p className="mt-1 text-sm text-deepBlue/80">
                  Learn key vocabulary from this article with simple meanings, pronunciation, and examples.
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
                : analysis.difficultWords.filter((word) => word.category === activeFilter)
              ).map((word) => (
                <article
                  key={word.word}
                  className="flex h-full flex-col rounded-xl border border-green/20 bg-white/70 p-4 shadow-sm"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold text-deepBlue">{word.word}</h3>
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
                    <span className="font-semibold text-deepBlue/80">{word.pronunciation}</span>
                  </p>
                  <p className="mt-3 text-[15px] leading-relaxed text-deepBlue/90">{word.definition}</p>
                  <p className="mt-3 text-sm text-deepBlue/80">
                    <span className="font-semibold text-deepBlue">Example:</span> {word.example}
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