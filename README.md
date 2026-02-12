# NewSeries — News Bias Analyzer (Visual Preview)

A **visual preview only** Next.js site for the NewSeries news bias analyzer. All data is mock; no real analysis.

## Tech stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — hero, Why NewSeries (6 cards), stats, CTA |
| `/analyze` | Paste text or URL, "Analyze Article" → 2s loading → `/results` |
| `/results` | Mock summary, bias signals, meter (65/100), key facts, Think About It |
| `/how-it-works` | Mission, 4-step process, audience, team (Matthew, Will, Justin) |
| `/faq` | 6 FAQs with answers |
| `/examples` | 2 sample analyses, "Try it yourself" → `/analyze` |

## Design

- **Colors:** Navy `#1e3a5f`, orange `#ff6b35`, cream `#f5f5dc`
- **Typography:** Serif headings, sans-serif body
- Sticky nav, rounded orange buttons, card shadows, mobile responsive
