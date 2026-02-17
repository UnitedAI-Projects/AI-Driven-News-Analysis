"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const biasSignals = [
  {
    title: "Loaded language",
    explanation: "Phrases like 'slams' and 'blasted' suggest conflict and blame rather than neutral reporting.",
  },
  {
    title: "Single-source framing",
    explanation: "The piece relies heavily on one official source without contrasting viewpoints.",
  },
  {
    title: "Emotional framing",
    explanation: "Headline and lead emphasize fear or urgency that may skew reader perception.",
  },
  {
    title: "Omission of context",
    explanation: "Key background or prior events that would balance the narrative are not mentioned.",
  },
];

const keyFacts = [
  "The policy was announced on Tuesday and takes effect next month.",
  "Three independent studies have been cited; methodology varies.",
  "The figure of 65% comes from a government report released in 2024.",
  "Opposition groups have called for a delay; no vote has been scheduled.",
  "Similar measures exist in at least five other countries.",
  "The agency in charge has not yet commented on implementation details.",
];

const reflectionQuestions = [
  "Who benefits from this framing, and who might be left out?",
  "What would a headline from the 'other side' look like?",
  "Which claims are verified with evidence vs. asserted?",
  "What would you need to read next to form a more complete view?",
];

const METER_SCORE = 65;

export default function ResultsPage() {
  const [meterWidth, setMeterWidth] = useState(0);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      setTimeout(() => setMeterWidth(METER_SCORE), 100);
    });
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-deepBlue">Analysis Results</h1>
      <p className="mt-1 text-deepBlue/70">Mock results — for design preview only.</p>

      {/* Summary */}
      <section className="mt-8 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/90 p-6 shadow-lg shadow-green/10 transition hover:shadow-glow-green">
        <h2 className="font-serif text-xl font-bold text-deepBlue">Summary</h2>
        <p className="mt-3 text-deepBlue/90 leading-relaxed">
          This article presents a policy announcement with moderate bias indicators. The tone leans
          toward one perspective through word choice and source selection, while several verifiable
          facts are included. We detected loaded language, limited source diversity, and some
          emotional framing. The piece is still informative but benefits from reading alongside
          other sources.
        </p>
      </section>

      {/* Bias meter - animated fill */}
      <section className="mt-8 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/80 p-6 shadow-lg shadow-green/10">
        <h2 className="font-serif text-xl font-bold text-deepBlue">Bias meter</h2>
        <div className="mt-3 flex items-center gap-4">
          <div className="relative h-8 w-full max-w-xs overflow-hidden rounded-full bg-deepBlue/20">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-green to-greenLight shadow-glow-green transition-all duration-1000 ease-out"
              style={{ width: `${meterWidth}%` }}
            />
          </div>
          <span className="font-serif text-2xl font-bold text-deepBlue">{METER_SCORE}/100</span>
        </div>
        <p className="mt-1 text-sm text-deepBlue/70">Higher score = more neutral; lower = more biased.</p>
      </section>

      {/* Bias signals */}
      <section className="mt-8">
        <h2 className="font-serif text-xl font-bold text-deepBlue">Bias signals detected</h2>
        <ul className="mt-4 space-y-4">
          {biasSignals.map((s) => (
            <li
              key={s.title}
              className="rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/90 p-4 shadow-lg shadow-green/10 transition hover:shadow-glow-green"
            >
              <h3 className="font-semibold text-deepBlue">{s.title}</h3>
              <p className="mt-1 text-sm text-deepBlue/80">{s.explanation}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Key facts */}
      <section className="mt-8 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/80 p-6 shadow-lg shadow-green/10">
        <h2 className="font-serif text-xl font-bold text-deepBlue">Key facts</h2>
        <ul className="mt-4 list-inside list-disc space-y-2 text-deepBlue/90">
          {keyFacts.map((fact, i) => (
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
          {reflectionQuestions.map((q, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-green font-medium">{i + 1}.</span>
              <span className="text-deepBlue/90">{q}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 text-center">
        <Link
          href="/#analyze"
          className="inline-block rounded-full bg-gradient-to-r from-green to-greenLight px-8 py-4 font-semibold text-white shadow-glow-green transition hover:shadow-glow-green-lg"
        >
          Analyze Another
        </Link>
      </div>
    </div>
  );
}
