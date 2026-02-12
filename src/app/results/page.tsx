import Link from "next/link";

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

export default function ResultsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-navy">Analysis Results</h1>
      <p className="mt-1 text-navy/70">Mock results — for design preview only.</p>

      {/* Summary */}
      <section className="mt-8 rounded-xl border border-navy/10 bg-white p-6 shadow-md">
        <h2 className="font-serif text-xl font-bold text-navy">Summary</h2>
        <p className="mt-3 text-navy/90 leading-relaxed">
          This article presents a policy announcement with moderate bias indicators. The tone leans
          toward one perspective through word choice and source selection, while several verifiable
          facts are included. We detected loaded language, limited source diversity, and some
          emotional framing. The piece is still informative but benefits from reading alongside
          other sources.
        </p>
      </section>

      {/* Bias meter */}
      <section className="mt-8">
        <h2 className="font-serif text-xl font-bold text-navy">Bias meter</h2>
        <div className="mt-3 flex items-center gap-4">
          <div className="relative h-8 w-full max-w-xs overflow-hidden rounded-full bg-navy/10">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-orange transition-all"
              style={{ width: "65%" }}
            />
          </div>
          <span className="font-serif text-2xl font-bold text-navy">65/100</span>
        </div>
        <p className="mt-1 text-sm text-navy/70">Higher score = more neutral; lower = more biased.</p>
      </section>

      {/* Bias signals */}
      <section className="mt-8">
        <h2 className="font-serif text-xl font-bold text-navy">Bias signals detected</h2>
        <ul className="mt-4 space-y-4">
          {biasSignals.map((s) => (
            <li
              key={s.title}
              className="rounded-xl border border-navy/10 bg-white p-4 shadow-sm"
            >
              <h3 className="font-semibold text-navy">{s.title}</h3>
              <p className="mt-1 text-sm text-navy/80">{s.explanation}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Key facts */}
      <section className="mt-8">
        <h2 className="font-serif text-xl font-bold text-navy">Key facts</h2>
        <ul className="mt-4 list-inside list-disc space-y-2 text-navy/90">
          {keyFacts.map((fact, i) => (
            <li key={i}>{fact}</li>
          ))}
        </ul>
      </section>

      {/* Think About It */}
      <section className="mt-8 rounded-xl border-2 border-orange/40 bg-orange/5 p-6">
        <h2 className="font-serif text-xl font-bold text-navy">Think About It</h2>
        <p className="mt-2 text-navy/80">
          Use these questions to reflect on what you read and how it was presented.
        </p>
        <ul className="mt-4 space-y-2">
          {reflectionQuestions.map((q, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-orange font-medium">{i + 1}.</span>
              <span className="text-navy/90">{q}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 text-center">
        <Link
          href="/analyze"
          className="inline-block rounded-full bg-orange px-8 py-4 font-semibold text-white transition hover:bg-orange/90"
        >
          Analyze Another
        </Link>
      </div>
    </div>
  );
}
