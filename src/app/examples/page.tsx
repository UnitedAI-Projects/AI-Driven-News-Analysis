import Link from "next/link";

const sampleAnalyses = [
  {
    title: "Sample analysis: Policy coverage",
    source: "Mock source — Government policy announcement",
    summary: "This sample shows how we flag loaded language ('slams', 'blasted'), single-source reliance, and missing context. The bias meter lands at 65/100 with clear explanations for each signal.",
    biasScore: 65,
  },
  {
    title: "Sample analysis: Health/tech reporting",
    source: "Mock source — Tech product launch",
    summary: "A second example illustrates emotional framing in the headline and lead, plus limited diversity of sources. Key facts are extracted and reflection questions help you think about what’s missing.",
    biasScore: 58,
  },
];

export default function ExamplesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-navy md:text-4xl">Example analyses</h1>
      <p className="mt-2 text-navy/80">
        See what a NewSeries report looks like — these are mock results for design preview.
      </p>

      <div className="mt-8 space-y-8">
        {sampleAnalyses.map((sample, i) => (
          <div
            key={i}
            className="rounded-xl border border-navy/10 bg-white p-6 shadow-md"
          >
            <h2 className="font-serif text-xl font-bold text-navy">{sample.title}</h2>
            <p className="mt-1 text-sm text-navy/70">{sample.source}</p>
            <p className="mt-3 text-navy/90 leading-relaxed">{sample.summary}</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-navy/70">Bias meter:</span>
              <span className="font-serif font-bold text-orange">{sample.biasScore}/100</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/analyze"
          className="inline-block rounded-full bg-orange px-8 py-4 font-semibold text-white transition hover:bg-orange/90"
        >
          Try it yourself
        </Link>
      </div>
    </div>
  );
}
