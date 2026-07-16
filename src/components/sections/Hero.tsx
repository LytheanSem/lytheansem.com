"use client";

import { useEffect, useRef } from "react";
import { View } from "@react-three/drei";
import AutumnScene from "@/components/gl/AutumnScene";
import { useGlReady } from "@/components/gl/CanvasRoot";
import { gustNow, pointer } from "@/components/gl/pointer";
import { site } from "@/data/portfolio";
import LeafMark from "@/components/ui/LeafMark";

/** Soft shadow lifting text off the bright canopy/moon areas behind it. */
const lift = "[text-shadow:0_1px_14px_rgba(7,12,20,0.85)]";

export default function Hero() {
  const ready = useGlReady();
  const section = useRef<HTMLElement>(null);

  // gate the main scene's per-frame CPU work to when the hero is on screen
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        pointer.heroVisible = entry.isIntersecting;
      },
      { rootMargin: "20% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={section}
      id="top"
      className="relative h-[100svh] min-h-[620px] overflow-clip"
      onClick={(e) => gustNow((e.clientX / window.innerWidth) * 2 - 1)}
    >
      {/* the living scene */}
      {ready && (
        <View className="absolute inset-0">
          <AutumnScene />
        </View>
      )}

      {/* proverb — vertical, right edge */}
      <p
        className="vertical-text rise absolute right-6 top-1/2 z-10 hidden -translate-y-1/2 font-mono text-[10px] uppercase text-paper/45 md:block"
        style={{ animationDelay: "900ms" }}
        aria-hidden
      >
        Fall seven times — rise eight
      </p>

      {/* name block */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-6xl px-6 pb-24">
          <p
            className={`rise mb-4 font-mono text-[11px] uppercase tracking-[0.4em] text-momiji-300 ${lift}`}
            style={{ animationDelay: "150ms" }}
          >
            Full-Stack Engineer — {site.location}
          </p>
          <h1
            className={`rise font-display text-6xl font-extrabold leading-[0.95] tracking-tight text-paper md:text-8xl ${lift}`}
            style={{ animationDelay: "300ms" }}
          >
            Lythean
            <br />
            Sem
            <span className="hanko ml-5 inline-flex h-[0.3em] w-[0.3em] -translate-y-[0.35em]">
              <LeafMark className="h-[0.17em] rotate-[24deg]" />
            </span>
          </h1>
          <p
            className={`rise mt-6 max-w-md text-[15px] leading-relaxed text-ink-200 ${lift}`}
            style={{ animationDelay: "500ms" }}
          >
            They call me <span className="text-paper">Zen</span>. I build calm, dependable
            software for real businesses — retail systems, SaaS platforms, and encrypted
            tools, from Phnom Penh.
          </p>
          <div
            className="rise mt-9 flex flex-wrap items-center gap-8"
            style={{ animationDelay: "650ms" }}
          >
            <a
              href="#works"
              className="group border border-momiji-600/60 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.3em] text-momiji-300 transition-all hover:border-momiji-400 hover:bg-momiji-600/10"
            >
              Selected works <span className="inline-block transition-transform group-hover:translate-y-0.5">↓</span>
            </a>
            <a
              href={`mailto:${site.email}`}
              className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-200 underline decoration-ink-500 underline-offset-8 transition-colors hover:text-paper hover:decoration-momiji-500"
            >
              {site.email}
            </a>
          </div>
        </div>
      </div>

      {/* wind affordance */}
      <p
        className="rise absolute bottom-7 right-6 z-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-paper/60"
        style={{ animationDelay: "1100ms" }}
      >
        <LeafMark className="h-3 rotate-[70deg]" />
        <span className="pointer-coarse:hidden">click to stir the wind</span>
        <span className="hidden pointer-coarse:inline">tap to stir the wind</span>
      </p>

      {/* blend into the ink below */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent to-ink-950" />
    </section>
  );
}
