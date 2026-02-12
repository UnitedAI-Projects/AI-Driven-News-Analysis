"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const exampleArticles = [
  {
    title: "Sample: Political coverage headline",
    snippet: "Paste or enter the full text of a news article here to analyze its bias signals...",
  },
  {
    title: "Sample: Health/tech reporting",
    snippet: "Or paste a URL and we'll fetch the article for you. Supports major news sites and blogs.",
  },
  {
    title: "Sample: Opinion vs news",
    snippet: "We highlight framing, loaded language, and source diversity so you can decide for yourself.",
  },
];

export default function AnalyzePage() {
  const router = useRouter();
  const [articleText, setArticleText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
    router.push("/results");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-navy md:text-4xl">Analyze an Article</h1>
      <p className="mt-2 text-navy/80">
        Paste the article text or enter a URL. We’ll break down bias signals and key facts.
      </p>

      <form onSubmit={handleAnalyze} className="mt-8 space-y-6">
        <div>
          <label htmlFor="url" className="block font-medium text-navy">
            Article URL (optional)
          </label>
          <input
            id="url"
            type="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-2 w-full rounded-lg border border-navy/20 bg-white px-4 py-3 text-navy placeholder:text-navy/50 focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/30"
          />
        </div>
        <div>
          <label htmlFor="article" className="block font-medium text-navy">
            Or paste article text
          </label>
          <textarea
            id="article"
            rows={10}
            placeholder="Paste the full text of the article here..."
            value={articleText}
            onChange={(e) => setArticleText(e.target.value)}
            className="mt-2 w-full rounded-lg border border-navy/20 bg-white px-4 py-3 text-navy placeholder:text-navy/50 focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/30"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-orange py-4 font-semibold text-white transition hover:bg-orange/90 disabled:opacity-70"
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

      <section className="mt-12">
        <h2 className="font-serif text-xl font-bold text-navy">Example inputs (for show)</h2>
        <div className="mt-4 space-y-4">
          {exampleArticles.map((ex) => (
            <div
              key={ex.title}
              className="rounded-xl border border-navy/10 bg-white p-4 shadow-sm"
            >
              <h3 className="font-medium text-navy">{ex.title}</h3>
              <p className="mt-1 text-sm text-navy/70">{ex.snippet}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
