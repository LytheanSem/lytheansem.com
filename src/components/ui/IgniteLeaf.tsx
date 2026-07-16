"use client";

import { useEffect, useRef, useState } from "react";
import LeafMark from "./LeafMark";

/**
 * A leaf mark that starts ink-dim and ignites to momiji once the reader
 * scrolls it past the page's reading line — a quiet trail of where you've
 * been. Ignites once and stays lit.
 */
export default function IgniteLeaf({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [lit, setLit] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        // lit when crossing the reading band — or already above it, so a
        // fast scroll (or a deep anchor load) can never skip an ignition
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          setLit(true);
          io.disconnect();
        }
      },
      // the same mid-viewport reading band the nav scrollspy uses
      { rootMargin: "-35% 0px -45% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      className={`inline-flex transition-colors duration-700 ${
        lit ? "text-momiji-500" : "text-ink-600"
      }`}
      aria-hidden
    >
      <LeafMark className={className} />
    </span>
  );
}
