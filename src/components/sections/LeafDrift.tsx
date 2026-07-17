"use client";

import { useEffect, useRef, useState } from "react";
import LeafMark from "@/components/ui/LeafMark";

type Drift = {
  id: number;
  leftPct: number;
  fall: number; // vh, negative — how far above the resting spot it starts
  dur: number; // s
  tumble: number; // total deg of rotation on the way down
  swayA: number; // px
  swayB: number; // px
  size: number; // px
  color: string;
  rest: number; // px above the hero's foot — persisted so the pile reloads
  // exactly where it settled
  leaving?: boolean; // oldest leaves fade out before removal — never pop
  settled?: boolean; // restored from a previous visit — rendered at rest
};

const STORE_KEY = "field-drift";

const LEAF_COLORS = ["#a53318", "#c2431f", "#e8622c", "#ef7a37"];

/**
 * The wind remembers: each gust tears a leaf or two loose that tumble down
 * the DOM layer and come to rest along the hero's foot — stir the wind a few
 * times and you leave a small drift pile for the rest of your visit.
 *
 * Self-contained on purpose: it listens for hero clicks itself, so spawning
 * leaves never re-renders the hero (and with it the WebGL <View> subtree).
 * Sits at z-[5]: above the bottom gradient, behind the name block and CTAs —
 * resting leaves read as scene debris, not icons on top of the UI.
 */
export default function LeafDrift() {
  const [leaves, setLeaves] = useState<Drift[]>([]);
  const nextId = useRef(0);
  // state, not a ref: the mount-commit persist run must see this render's
  // false and skip — a ref flips synchronously and the first persist would
  // write "[]" over the saved pile before the restore re-render lands
  const [restored, setRestored] = useState(false);

  // the wind remembers: last visit's drift is still resting at the field's
  // foot when you return (restored after mount — never during hydration)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Drift[];
        if (Array.isArray(saved) && saved.length) {
          setLeaves(
            saved.slice(-14).map((l) => ({
              ...l,
              id: nextId.current++,
              leaving: false,
              settled: true,
            }))
          );
        }
      }
    } catch {
      // unreadable pocket — the field starts bare
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    // a pile, once made, is never legitimately empty again — refusing to
    // write [] also closes the last sliver of the overwrite window
    if (!restored || !leaves.length) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(leaves.filter((l) => !l.leaving)));
    } catch {
      // storage blocked or full — the wind forgets, gracefully
    }
  }, [restored, leaves]);

  useEffect(() => {
    // decorative — skip entirely for reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      // only true field clicks — the ones that actually stir the wind
      if (!t || !t.closest("#top") || t.closest("a, button")) return;
      const n = Math.random() < 0.45 ? 2 : 1;
      const spawned: Drift[] = [];
      for (let i = 0; i < n; i++) {
        const xPx = e.clientX + (Math.random() - 0.5) * 200;
        const id = nextId.current++;
        spawned.push({
          id,
          // clamp clear of the edges and the wind hint's bottom-right corner
          leftPct: Math.min(Math.max((xPx / window.innerWidth) * 100, 4), 76),
          fall: -(22 + Math.random() * 26),
          dur: 2.2 + Math.random() * 1.3,
          tumble: (Math.random() < 0.5 ? -1 : 1) * (400 + Math.random() * 420),
          swayA: (Math.random() - 0.5) * 56,
          swayB: (Math.random() - 0.5) * 40,
          size: 10 + Math.random() * 7,
          color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
          rest: 8 + (id % 4) * 4,
        });
      }
      // a small drift, not a carpet — the oldest leaves fade away first
      // (marked leaving, removed after their fade; never a hard pop)
      setLeaves((prev) => {
        const next = [...prev, ...spawned];
        const overflow = next.length - 14;
        if (overflow <= 0) return next;
        const goners = next.slice(0, overflow).map((l) => l.id);
        setTimeout(() => {
          setLeaves((cur) => cur.filter((l) => !goners.includes(l.id)));
        }, 800);
        return next.map((l, i) => (i < overflow ? { ...l, leaving: true } : l));
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-44">
      {leaves.map((l) => (
        // the fade-out lives on this OUTER span: the settle animation's
        // fill holds the inner element's opacity, so a transition there
        // would never run
        <span
          key={l.id}
          className={`absolute transition-opacity duration-700 ${l.leaving ? "opacity-0" : ""}`}
          style={{ left: `${l.leftPct}%`, bottom: `${l.rest ?? 8}px` }}
        >
          <span
            className={l.settled ? "block" : "leaf-settle block"}
            style={
              {
                // restored leaves render at rest — no re-tumble on return
                ...(l.settled
                  ? { transform: `rotate(${l.tumble}deg)` }
                  : {
                      "--fall": `${l.fall}vh`,
                      "--dur": `${l.dur}s`,
                      "--tumble": `${l.tumble}deg`,
                      "--sway-a": `${l.swayA}px`,
                      "--sway-b": `${l.swayB}px`,
                    }),
                color: l.color,
              } as React.CSSProperties
            }
          >
            <LeafMark style={{ height: l.size }} />
          </span>
        </span>
      ))}
    </div>
  );
}
