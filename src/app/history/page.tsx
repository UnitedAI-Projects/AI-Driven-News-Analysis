"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const HISTORY_KEY = "newseries-analysis-history";

type HistoryItem = {
  url: string;
  title?: string | null;
  timestamp: string;
};

export default function HistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      setItems(raw ? JSON.parse(raw) : []);
    } catch {
      setItems([]);
    }
  }, []);

  const clearHistory = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(HISTORY_KEY);
    setItems([]);
  };

  const reAnalyze = (url: string) => {
    router.push("/?url=" + encodeURIComponent(url) + "#analyze");
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-serif text-3xl font-bold text-deepBlue md:text-4xl">History</h1>
        <p className="mt-2 text-deepBlue/80">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-deepBlue md:text-4xl">History</h1>
      <p className="mt-2 text-deepBlue/80">
        Past articles you've analyzed. Click a title to re-analyze it.
      </p>

      {items.length > 0 ? (
        <>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={clearHistory}
              className="rounded-full border-2 border-green/50 bg-blueLight/80 px-4 py-2 text-sm font-semibold text-green transition hover:bg-green/20 hover:shadow-glow-green"
            >
              Clear History
            </button>
          </div>
          <ul className="mt-4 space-y-3">
            {items.map((item, i) => (
              <li
                key={`${item.url}-${item.timestamp}-${i}`}
                className="rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/90 p-4 shadow-lg shadow-green/10 transition hover:shadow-glow-green"
              >
                <button
                  type="button"
                  onClick={() => reAnalyze(item.url)}
                  className="w-full text-left"
                >
                  <p className="font-medium text-deepBlue break-all">
                    {item.title?.trim() || item.url}
                  </p>
                  <p className="mt-1 text-sm text-deepBlue/60">{formatDate(item.timestamp)}</p>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-8 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/90 p-8 text-center shadow-lg shadow-green/10">
          <p className="text-deepBlue/80">No analysis history yet.</p>
          <p className="mt-1 text-sm text-deepBlue/60">
            When you analyze an article by URL, it will appear here.
          </p>
          <Link
            href="/#analyze"
            className="mt-6 inline-block rounded-full bg-gradient-to-r from-green to-greenLight px-6 py-3 font-semibold text-white shadow-glow-green transition hover:shadow-glow-green-lg"
          >
            Analyze an Article
          </Link>
        </div>
      )}
    </div>
  );
}
