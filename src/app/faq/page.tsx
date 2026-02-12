const faqs = [
  {
    q: "What does the bias score mean?",
    a: "The bias meter (0–100) reflects how neutral the article’s framing and language appear. Higher scores suggest more balanced, fact-forward reporting; lower scores indicate stronger emotional or one-sided framing. We explain which signals we detected so you can interpret the score yourself.",
  },
  {
    q: "Do you store my articles or reading history?",
    a: "No. We analyze on demand and don’t keep your pasted text or URLs. We’re privacy-focused and don’t tie analysis to your identity.",
  },
  {
    q: "Which sources can I analyze?",
    a: "You can paste text from any article. For URL analysis, we support major news sites, many blogs, and common content formats. If a URL isn’t supported, pasting the article text still works.",
  },
  {
    q: "Is NewSeries telling me what to believe?",
    a: "No. We surface bias signals, key facts, and reflection questions. We don’t label articles as 'good' or 'bad' — we help you see how they’re framed so you can make your own judgment.",
  },
  {
    q: "How accurate is the analysis?",
    a: "Our models are trained to detect common bias patterns (loaded language, source balance, etc.) and we continuously improve them. We aim for high accuracy but recommend using our reports as one input among many when evaluating news.",
  },
  {
    q: "Can I use NewSeries in the classroom?",
    a: "Yes. NewSeries is designed as an educational tool to teach critical reading and media literacy. Teachers can use sample analyses and the reflection questions to guide discussions about bias and framing.",
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-3xl font-bold text-navy md:text-4xl">Frequently Asked Questions</h1>
      <p className="mt-2 text-navy/80">Quick answers about how NewSeries works and what to expect.</p>

      <div className="mt-8 space-y-4">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="rounded-xl border border-navy/10 bg-white p-6 shadow-sm"
          >
            <h2 className="font-semibold text-navy">{faq.q}</h2>
            <p className="mt-2 text-navy/80 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
