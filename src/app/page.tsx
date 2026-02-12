import Link from "next/link";

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
    description: "We don’t store your reading history or tie analysis to your identity.",
  },
  {
    title: "Multi-Source Support",
    description: "Analyze articles from major outlets, blogs, and social media in one place.",
  },
];

const stats = [
  { value: "95%", label: "Accuracy" },
  { value: "60s", label: "Analysis time" },
  { value: "50k+", label: "Articles" },
  { value: "10k+", label: "Users" },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-cream">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center md:py-28">
          <h1 className="font-serif text-4xl font-bold leading-tight md:text-5xl">
            Cutting Through the Noise to Find the Truth
          </h1>
          <p className="mt-4 text-lg text-cream/90">
            NewSeries analyzes news articles for bias so you can read with clarity and confidence.
          </p>
          <Link
            href="/analyze"
            className="mt-8 inline-block rounded-full bg-orange px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-orange/90"
          >
            TRY NOW
          </Link>
        </div>
      </section>

      {/* Why NewSeries */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-serif text-3xl font-bold text-navy md:text-4xl">Why NewSeries?</h2>
        <p className="mt-2 text-navy/80">
          Built to help you understand how news is framed — not to tell you what to think.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {whyCards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-navy/10 bg-white p-6 shadow-md transition hover:shadow-lg"
            >
              <h3 className="font-serif text-xl font-bold text-navy">{card.title}</h3>
              <p className="mt-2 text-navy/80">{card.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-navy/10 bg-white py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <span className="font-serif text-3xl font-bold text-orange md:text-4xl">{value}</span>
                <p className="mt-1 text-navy/70">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="font-serif text-3xl font-bold text-navy">Ready to Cut Through the Bias?</h2>
        <p className="mt-2 text-navy/80">Paste an article or URL and get an instant bias breakdown.</p>
        <Link
          href="/analyze"
          className="mt-6 inline-block rounded-full bg-orange px-8 py-4 font-semibold text-white transition hover:bg-orange/90"
        >
          Analyze an Article
        </Link>
      </section>
    </div>
  );
}
