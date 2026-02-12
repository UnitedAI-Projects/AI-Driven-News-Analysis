"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/analyze", label: "Analyze" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/examples", label: "Examples" },
  { href: "/faq", label: "FAQ" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-navy text-cream shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-serif text-xl font-bold text-cream">
          NewSeries
        </Link>
        <ul className="hidden items-center gap-6 md:flex">
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`rounded px-2 py-1 transition ${
                  pathname === href ? "bg-orange/20 text-orange" : "hover:bg-white/10"
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/analyze"
          className="hidden rounded-full bg-orange px-4 py-2 font-semibold text-white transition hover:bg-orange/90 md:inline-block"
        >
          Try Now
        </Link>
        <button
          type="button"
          className="rounded p-2 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path d="M18.278 16.864a1 1 0 0 1-1.414 1.414L12 13.414l-4.864 4.864a1 1 0 0 1-1.414-1.414L10.586 12 5.722 7.136a1 1 0 0 1 1.414-1.414L12 10.586l4.864-4.864a1 1 0 1 1 1.414 1.414L13.414 12l4.864 4.864z" />
            ) : (
              <path d="M4 5h16v2H4V5zm0 6h16v2H4v-2zm0 6h16v2H4v-2z" />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <div className="border-t border-white/20 px-4 py-3 md:hidden">
          <ul className="flex flex-col gap-2">
            {navLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`block rounded px-3 py-2 ${
                    pathname === href ? "bg-orange/20 text-orange" : ""
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/analyze"
                className="mt-2 block rounded-full bg-orange px-4 py-2 text-center font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Try Now
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
