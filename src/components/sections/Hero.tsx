"use client";

import { useEffect, useRef, useState } from "react";
import { View } from "@react-three/drei";
import AutumnScene from "@/components/gl/AutumnScene";
import { useGlReady } from "@/components/gl/CanvasRoot";
import { gustNow, meteorNow, pointer } from "@/components/gl/pointer";
import { site } from "@/data/portfolio";
import LeafMark from "@/components/ui/LeafMark";
import LeafDrift from "./LeafDrift";

/** Soft shadow lifting text off the bright canopy/moon areas behind it. */
const lift = "[text-shadow:0_1px_14px_rgba(7,12,20,0.85)]";

/**
 * "Click to stir the wind" — but a hint should hear the wind it invites.
 * The first gust makes its leaf tumble; after three, the visitor clearly
 * knows, and the invitation bows out. Self-contained (document listener)
 * so counting gusts never re-renders the hero's WebGL subtree.
 *
 * The entrance is transition-driven (not the `rise` animation): Chromium
 * won't start a transition from an animation-fill value, so an animated
 * entrance would make the later acknowledgment fades snap instead of ease.
 */
function WindHint() {
  const [gusts, setGusts] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setEntered(true), 1100);
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t || !t.closest("#top") || t.closest("a, button")) return;
      setGusts((g) => Math.min(g + 1, 3));
    };
    document.addEventListener("click", onClick);
    return () => {
      clearTimeout(id);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <p
      className={`absolute bottom-7 right-6 z-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-paper/60 transition-[opacity,transform] duration-1000 motion-reduce:transition-none ${
        !entered
          ? "translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100"
          : gusts >= 3
            ? "pointer-events-none opacity-0"
            : gusts > 0
              ? "opacity-40"
              : "opacity-100"
      }`}
    >
      <LeafMark key={gusts} className={`h-3 rotate-[70deg] ${gusts > 0 ? "leaf-tumble" : ""}`} />
      <span className="pointer-coarse:hidden">click to stir the wind</span>
      <span className="hidden pointer-coarse:inline">tap to stir the wind</span>
    </p>
  );
}

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
      onClick={(e) => {
        // links and buttons are navigation, not weather — no gust for them,
        // matching what WindHint and LeafDrift count as a stir of the wind
        if ((e.target as Element).closest("a, button")) return;
        gustNow((e.clientX / window.innerWidth) * 2 - 1);
      }}
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
            className={`rise mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-momiji-300 sm:tracking-[0.4em] ${lift}`}
            style={{ animationDelay: "150ms" }}
          >
            {/* the location never breaks mid-name on narrow screens */}
            Full-Stack Engineer — <span className="whitespace-nowrap">{site.location}</span>
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
            They call me{" "}
            {/* the name is the easter egg: tapping it summons the shooting star
                (touch parity for the typed z-e-n trigger) — and the click still
                bubbles to the section, so the wind stirs with it */}
            <span className="text-paper" onClick={meteorNow}>
              Zen
            </span>
            . I build calm, dependable software for real businesses — currently the
            senior engineer keeping a live supermarket&apos;s point of sale running,
            every day.
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

      {/* wind affordance — acknowledges the wind it invites */}
      <WindHint />

      {/* gust-torn leaves settling into a drift at the hero's foot */}
      <LeafDrift />

      {/* blend into the ink below */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent to-ink-950" />
    </section>
  );
}
