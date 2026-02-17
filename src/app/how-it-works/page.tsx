import Link from "next/link";

const steps = [
  { num: 1, title: "Paste or link", description: "Enter the article URL or paste the full text into the analyzer." },
  { num: 2, title: "We analyze", description: "Our system scans for framing, loaded language, source balance, and factual claims." },
  { num: 3, title: "You get a report", description: "See a bias meter, key facts, and reflection questions — not a verdict." },
  { num: 4, title: "Read with clarity", description: "Use the insights to decide what to trust and what to question." },
];

const team = [
  { name: "Justin Martinez", role: "Co-founder" },
  { name: "William Cook", role: "Co-founder" },
  { name: "Matthew Cohen", role: "Co-founder" },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-deepBlue md:text-4xl">How It Works</h1>

      {/* Mission */}
      <section className="mt-8 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/90 p-6 shadow-lg shadow-green/10 transition hover:shadow-glow-green">
        <h2 className="font-serif text-xl font-bold text-deepBlue">Our mission</h2>
        <p className="mt-3 text-deepBlue/90 leading-relaxed">
          NewSeries exists to help people cut through the noise and read the news with clarity. We
          don’t tell you what to think — we surface bias signals, key facts, and questions so you
          can form your own informed view. We believe transparency about how news is framed makes
          everyone a better consumer of information.
        </p>
      </section>

      {/* 4-step process */}
      <section className="mt-10 relative">
        <h2 className="font-serif text-2xl font-bold text-deepBlue">The process</h2>
        <div className="mt-6 space-y-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="flex gap-4 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/90 p-5 shadow-lg shadow-green/10 transition hover:shadow-glow-green"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green to-greenLight font-serif text-lg font-bold text-white shadow-glow-green">
                {step.num}
              </div>
              <div>
                <h3 className="font-semibold text-deepBlue">{step.title}</h3>
                <p className="mt-1 text-deepBlue/80">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Target audience */}
      <section className="mt-10 rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/80 p-6 shadow-lg shadow-green/10">
        <h2 className="font-serif text-2xl font-bold text-deepBlue">Who it’s for</h2>
        <p className="mt-3 text-deepBlue/90 leading-relaxed">
          NewSeries is for anyone who wants to read the news more critically — students, educators,
          journalists, and everyday readers. If you’ve ever wondered whether an article is slanting
          the story or leaving out important context, our tool helps you see those signals and
          decide for yourself.
        </p>
      </section>

      {/* Team */}
      <section className="mt-10 relative">
        <h2 className="font-serif text-2xl font-bold text-deepBlue">The team</h2>
        <div className="mt-4 flex flex-wrap gap-4">
          {team.map((person) => (
            <div
              key={person.name}
              className="rounded-xl border border-green/20 bg-gradient-to-br from-blueLight to-greenBg/90 px-6 py-4 shadow-lg shadow-green/10 transition hover:shadow-glow-green"
            >
              <p className="font-semibold text-deepBlue">{person.name}</p>
              <p className="text-sm text-deepBlue/70">{person.role}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 text-center">
        <Link
          href="/#analyze"
          className="inline-block rounded-full bg-gradient-to-r from-green to-greenLight px-8 py-4 font-semibold text-white shadow-glow-green transition hover:shadow-glow-green-lg"
        >
          Try the analyzer
        </Link>
      </div>
    </div>
  );
}
