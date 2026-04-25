"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

const whyCards = [
  {
    title: "Precision Detection",
    description: "Our models identify subtle language patterns and framing that influence how you interpret the news.",
  },
  {
    title: "Instant Analysis",
    description: "Paste a link or article and get a clear bias breakdown in under a minute.",
  },
  {
    title: "Transparency First",
    description: "We show you exactly what signals we detected and why, so you can think for yourself.",
  },
  {
    title: "Educational Tool",
    description: "Learn to spot bias in any source and become a more critical consumer of information.",
  },
  {
    title: "Privacy Focused",
    description: "We don't store your reading history or tie analysis to your identity.",
  },
  {
    title: "Multi-Source Support",
    description: "Analyze articles from major outlets, blogs, and social media in one place.",
  },
];

const HISTORY_KEY = "newseries-analysis-history";

type HistoryItem = {
  url: string;
  title?: string | null;
  timestamp: string;
};

type ComparisonHeadToHead = {
  moreBiasedArticle: "A" | "B" | "Tie";
  biasDifference: number;
  toneComparison: string;
  uniqueFactsA: string[];
  uniqueFactsB: string[];
  verdict: string;
};

function saveToHistory(url: string, title?: string | null) {
  if (!url || !url.trim()) return;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(HISTORY_KEY) : null;
    const list: HistoryItem[] = raw ? JSON.parse(raw) : [];
    list.unshift({ url: url.trim(), title: title?.trim() || undefined, timestamp: new Date().toISOString() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 100)));
  } catch (_) {}
}

function coerceStringList(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const cleaned = value.map((item) => String(item).trim()).filter(Boolean);
    return cleaned.length ? cleaned : fallback;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map((item) => String(item).trim()).filter(Boolean);
        return cleaned.length ? cleaned : fallback;
      }
    } catch {
      // Continue with plain-text parsing.
    }
    const lines = trimmed
      .split("\n")
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
    return lines.length ? lines : [trimmed];
  }
  return fallback;
}

function normalizeAnalyzeResponse(data: any, urlFallback: string) {
  const summary = typeof data?.summary === "string" && data.summary.trim()
    ? data.summary.trim()
    : `We couldn't generate a short summary for this article. (Source: ${urlFallback})`;
  const keyFacts = coerceStringList(data?.keyFacts, ["Could not extract key facts."]);
  return {
    ...data,
    summary,
    keyFacts,
    url: typeof data?.url === "string" && data.url.trim() ? data.url : urlFallback,
  };
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [articleText, setArticleText] = useState("");
  const [url, setUrl] = useState("");
  const [compareUrlA, setCompareUrlA] = useState("");
  const [compareUrlB, setCompareUrlB] = useState("");
  const [compareTextA, setCompareTextA] = useState("");
  const [compareTextB, setCompareTextB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const u = searchParams.get("url");
    if (u) {
      setUrl(decodeURIComponent(u));
      setTimeout(() => document.getElementById("analyze")?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [searchParams]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedText = articleText.trim();
    const trimmedUrl = url.trim();

    if (!trimmedText && !trimmedUrl) {
      setError("Please enter an article URL or paste the article text to analyze.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          articleText: trimmedText,
          url: trimmedUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze article. Please try again.");
      }

      const data = await response.json();

      if (trimmedUrl) {
        const articleTitle =
          typeof data?.articleTitle === "string" && data.articleTitle.trim() ? data.articleTitle.trim() : undefined;
        saveToHistory(trimmedUrl, articleTitle);
      }

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("newseries-latest-analysis", JSON.stringify(data));
        } catch {
          // ignore storage errors
        }
      }

      router.push("/results");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUrlA = compareUrlA.trim();
    const trimmedUrlB = compareUrlB.trim();
    const trimmedTextA = compareTextA.trim();
    const trimmedTextB = compareTextB.trim();

    if (!trimmedUrlA && !trimmedTextA) {
      setError("Please enter a URL or paste article text for Article A.");
      return;
    }

    if (!trimmedUrlB && !trimmedTextB) {
      setError("Please enter a URL or paste article text for Article B.");
      return;
    }

    setLoading(true);
    try {
      const compareRequest = fetch("/api/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urlA: trimmedUrlA,
          urlB: trimmedUrlB,
        }),
      });

      const [responseA, responseB, compareResponse] = await Promise.all([
        fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: trimmedUrlA || undefined,
            // URL takes priority when both are provided.
            articleText: trimmedUrlA ? "" : trimmedTextA,
          }),
        }),
        fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: trimmedUrlB || undefined,
            // URL takes priority when both are provided.
            articleText: trimmedUrlB ? "" : trimmedTextB,
          }),
        }),
        compareRequest,
      ]);

      if (!responseA.ok || !responseB.ok || !compareResponse.ok) {
        throw new Error("Failed to compare articles. Please check both URLs and try again.");
      }

      const [rawDataA, rawDataB, headToHead] = await Promise.all([
        responseA.json(),
        responseB.json(),
        compareResponse.json(),
      ]);
      const dataA = normalizeAnalyzeResponse(rawDataA, trimmedUrlA);
      const dataB = normalizeAnalyzeResponse(rawDataB, trimmedUrlB);

      const titleA = typeof dataA?.articleTitle === "string" && dataA.articleTitle.trim() ? dataA.articleTitle.trim() : undefined;
      const titleB = typeof dataB?.articleTitle === "string" && dataB.articleTitle.trim() ? dataB.articleTitle.trim() : undefined;

      saveToHistory(trimmedUrlA, titleA);
      saveToHistory(trimmedUrlB, titleB);

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            "newseries-latest-comparison",
            JSON.stringify({
              left: dataA,
              right: dataB,
              headToHead: headToHead as ComparisonHeadToHead,
            })
          );
        } catch {
          // ignore storage errors
        }
      }

      router.push("/results?compare=1");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-deepBlue to-deepBlue/90 text-blueLight">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center md:py-28">
        <div className="flex items-center justify-center mb-6">
       <Image src="/WWW.png" alt="NewSeries" width={300} height={90} />
       </div>
       <h1 className="font-serif text-4xl font-bold leading-tight md:text-5xl">
       Built to help you understand how news is framed!
      </h1>
          <p className="mt-4 text-lg text-blueLight/90">
            NewSeries analyzes news articles for bias so you can read with clarity and confidence.
          </p>
          <a
            href="#analyze"
            className="mt-8 inline-block rounded-full bg-gradient-to-r from-green to-greenLight px-8 py-4 text-lg font-semibold text-white shadow-glow-green transition hover:shadow-glow-green-lg"
          >
            TRY NOW
          </a>
        </div>
      </section>

      {/* Analyze section */}
      <section id="analyze" className="border-t border-green/20 bg-gradient-to-b from-greenBg/50 to-blueLight py-16 scroll-mt-20">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-serif text-3xl font-bold text-deepBlue md:text-4xl">Analyze an Article</h2>
          <p className="mt-2 text-deepBlue/80">
            Paste the article text or enter a URL. We'll break down bias signals and key facts.
          </p>

          <form onSubmit={handleAnalyze} className="mt-8 space-y-6">
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="url" className="block font-medium text-deepBlue">
                Article URL (optional)
              </label>
              <input
                id="url"
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-2 w-full rounded-lg border border-green/30 bg-blueLight/80 px-4 py-3 text-deepBlue placeholder:text-deepBlue/50 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/30"
              />
            </div>
            <div>
              <label htmlFor="article" className="block font-medium text-deepBlue">
                Or paste article text
              </label>
              <textarea
                id="article"
                rows={10}
                placeholder="Paste the full text of the article here..."
                value={articleText}
                onChange={(e) => setArticleText(e.target.value)}
                className="mt-2 w-full rounded-lg border border-green/30 bg-blueLight/80 px-4 py-3 text-deepBlue placeholder:text-deepBlue/50 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/30"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-green to-greenLight py-4 font-semibold text-white shadow-glow-green transition hover:shadow-glow-green-lg disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden>
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Analyzing...
                </span>
              ) : (
                "Analyze Article"
              )}
            </button>
          </form>

          <div className="mt-10 rounded-xl border border-green/20 bg-white/50 p-6">
            <h3 className="font-serif text-2xl font-bold text-deepBlue">Compare Two Articles</h3>
            <p className="mt-2 text-deepBlue/80">
              Enter two article URLs to analyze framing side by side.
            </p>
            <form onSubmit={handleCompare} className="mt-6 space-y-4">
              <div>
                <label htmlFor="compare-url-a" className="block font-medium text-deepBlue">
                  First article URL
                </label>
                <input
                  id="compare-url-a"
                  type="url"
                  placeholder="https://example.com/article-one"
                  value={compareUrlA}
                  onChange={(e) => setCompareUrlA(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-green/30 bg-blueLight/80 px-4 py-3 text-deepBlue placeholder:text-deepBlue/50 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/30"
                />
              </div>
              <div>
                <label htmlFor="compare-text-a" className="block font-medium text-deepBlue">
                  Or paste first article text
                </label>
                <textarea
                  id="compare-text-a"
                  rows={6}
                  placeholder="Paste the full text for Article A..."
                  value={compareTextA}
                  onChange={(e) => setCompareTextA(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-green/30 bg-blueLight/80 px-4 py-3 text-deepBlue placeholder:text-deepBlue/50 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/30"
                />
              </div>
              <div>
                <label htmlFor="compare-url-b" className="block font-medium text-deepBlue">
                  Second article URL
                </label>
                <input
                  id="compare-url-b"
                  type="url"
                  placeholder="https://example.com/article-two"
                  value={compareUrlB}
                  onChange={(e) => setCompareUrlB(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-green/30 bg-blueLight/80 px-4 py-3 text-deepBlue placeholder:text-deepBlue/50 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/30"
                />
              </div>
              <div>
                <label htmlFor="compare-text-b" className="block font-medium text-deepBlue">
                  Or paste second article text
                </label>
                <textarea
                  id="compare-text-b"
                  rows={6}
                  placeholder="Paste the full text for Article B..."
                  value={compareTextB}
                  onChange={(e) => setCompareTextB(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-green/30 bg-blueLight/80 px-4 py-3 text-deepBlue placeholder:text-deepBlue/50 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/30"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full border-2 border-green bg-white py-4 font-semibold text-deepBlue transition hover:bg-green/10 disabled:opacity-70"
              >
                {loading ? "Comparing..." : "Compare Articles"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Why NewSeries */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-serif text-3xl font-bold text-deepBlue md:text-4xl">Why NewSeries?</h2>
        <p className="mt-2 text-deepBlue/80">
          Cutting through the noise to find the truth.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {whyCards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/90 p-6 shadow-lg shadow-green/10 transition hover:shadow-glow-green"
            >
              <h3 className="font-serif text-xl font-bold text-deepBlue">{card.title}</h3>
              <p className="mt-2 text-deepBlue/80">{card.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] bg-blueLight" />}>
      <HomePageContent />
    </Suspense>
  );
}
