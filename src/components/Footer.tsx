import Link from "next/link";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/history", label: "History" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/examples", label: "Examples" },
  { href: "/faq", label: "FAQ" },
];

export default function Footer() {
  return (
    <footer className="border-t border-green/20 bg-deepBlue text-blueLight">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <span className="font-serif text-lg font-bold">NewSeries</span>
          <ul className="flex flex-wrap justify-center gap-6">
            {footerLinks.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="hover:text-greenLight transition">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-center text-sm text-blueLight/80">
          © {new Date().getFullYear()} NewSeries. Visual preview only — no real analysis.
        </p>
      </div>
    </footer>
  );
}
