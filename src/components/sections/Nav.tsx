"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/data/portfolio";
import LeafMark from "@/components/ui/LeafMark";

const links = [
  { href: "#works", id: "works", label: "Works" },
  { href: "#about", id: "about", label: "About" },
  { href: "#contact", id: "contact", label: "Contact" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 40);
        // back near the top, no section is "current"
        if (window.scrollY < window.innerHeight * 0.4) setActive(null);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (barRef.current) {
          barRef.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // scrollspy — highlight the section under the reading line
  useEffect(() => {
    const sections = links
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => el !== null);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
        // back at the top — nothing active
        if (window.scrollY < window.innerHeight * 0.5) setActive(null);
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-ink-700/50 bg-ink-950/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <a href="#top" aria-label="Lythean Sem — back to top" className="group flex items-center gap-3">
          <span className="hanko h-9 w-9" aria-hidden>
            <LeafMark className="h-5 rotate-[24deg] transition-transform duration-500 group-hover:rotate-[80deg]" />
          </span>
          <span className="hidden font-display text-sm font-bold tracking-[0.25em] text-paper md:block">
            LYTHEAN&nbsp;SEM
          </span>
        </a>
        <div className="flex items-center gap-1 sm:gap-3">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              aria-current={active === l.id ? "location" : undefined}
              className={`inline-block px-2 py-3 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors sm:text-[11px] sm:tracking-[0.3em] ${
                active === l.id
                  ? "text-momiji-300 underline decoration-momiji-500 underline-offset-8"
                  : "text-ink-200 hover:text-momiji-300"
              }`}
            >
              {l.label}
            </a>
          ))}
          <a
            href={site.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub profile (opens in a new tab)"
            className="inline-block px-2 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-paper-dim transition-colors hover:text-momiji-300 sm:text-[11px] sm:tracking-[0.3em]"
          >
            GitHub ↗
          </a>
        </div>
      </nav>
      {/* reading progress — viewport-sized bar, transform-only animation */}
      <div
        ref={barRef}
        className="absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-momiji-600 to-momiji-400"
        style={{ transform: "scaleX(0)" }}
        aria-hidden
      />
    </header>
  );
}
