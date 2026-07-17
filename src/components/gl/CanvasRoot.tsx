"use client";

import {
  Component,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { preload } from "react-dom";
import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { pointer, meteorNow, cloudNow } from "./pointer";

// a quiet word for the engineers who open the console (they always do)
let greeted = false;

const GlReadyContext = createContext(false);
export const useGlReady = () => useContext(GlReadyContext);

/** If WebGL blows up at runtime, drop the canvas — the DOM site stands alone. */
class GlErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Single shared WebGL canvas for the whole site (iOS context limits!).
 * Every scene — the main autumn backdrop and each project emblem — renders
 * through a drei <View> into this one fixed canvas. It sits at z -1 so all
 * DOM content wins by default; emblem areas are transparent windows onto it.
 */
export default function CanvasRoot({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null!);
  const [ready, setReady] = useState(false);

  // hoisted into the document <head> during server rendering: the browser
  // starts downloading the samurai the moment it parses the HTML, long
  // before any JavaScript arrives. crossOrigin makes the hint's request
  // mode match the loader's fetch() — without it the preload is discarded
  // and the model downloads twice
  preload("/models/samurai.glb", { as: "fetch", crossOrigin: "anonymous" });

  useEffect(() => {
    setReady(webglAvailable());
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotion = () => {
      pointer.motion = media.matches ? 0.25 : 1;
    };
    applyMotion();
    media.addEventListener("change", applyMotion);
    // still-cursor tracking is desktop-only: on touch, the "cursor" freezes at
    // the last tap and a leaf homing to an invisible point reads as a bug
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const stillAnchor = { x: -1e4, y: -1e4 };
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      if (!finePointer) return;
      // a wobble under 12px doesn't count as movement — hands aren't tripods
      if (Math.hypot(e.clientX - stillAnchor.x, e.clientY - stillAnchor.y) > 12) {
        stillAnchor.x = e.clientX;
        stillAnchor.y = e.clientY;
        pointer.stillSince = performance.now();
        // the leaf only visits a cursor resting over the open field — never
        // one parked on text, links, or controls
        const el = e.target as Element | null;
        pointer.stillEligible = !!el && !el.closest("a, button, h1, p, nav, input");
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    // preview flags for scheduled events, and a small secret: type z-e-n
    // (exact ?flag=1 params — substring matching would trip on UTM junk)
    const params = new URLSearchParams(window.location.search);
    pointer.cloudForce = params.get("cloud") === "1";
    pointer.glintForce = params.get("glint") === "1";
    pointer.birdsForce = params.get("birds") === "1";
    // two summoning words: z-e-n calls a star, m-o-o-n calls the cloud
    let sequence = "";
    const onKey = (e: KeyboardEvent) => {
      sequence = (sequence + e.key.toLowerCase()).slice(-4);
      if (sequence.endsWith("zen")) meteorNow();
      else if (sequence === "moon") cloudNow();
    };
    window.addEventListener("keydown", onKey);
    // when the visitor leaves for another tab, the field keeps living
    const WHISPER = "the wind keeps moving — Lythean Sem";
    const baseTitle = document.title;
    const onVisibility = () => {
      document.title = document.hidden ? WHISPER : baseTitle;
    };
    document.addEventListener("visibilitychange", onVisibility);
    if (!greeted) {
      greeted = true;
      console.log(
        "%cFall seven times — rise eight.%c\n\nHandcrafted with Next.js × Three.js — source: https://github.com/LytheanSem/lytheansem.com\nThe field listens. Try typing z-e-n.",
        "font-family: Georgia, serif; font-size: 15px; color: #e8622c;",
        "font-family: ui-monospace, monospace; font-size: 11px; color: #8fa2b8;"
      );
    }
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      media.removeEventListener("change", applyMotion);
      document.removeEventListener("visibilitychange", onVisibility);
      // restore ONLY if the whisper is showing — a blind restore would stomp
      // the next route's title after a client-side navigation
      if (document.title === WHISPER) document.title = baseTitle;
    };
  }, []);

  return (
    <GlReadyContext.Provider value={ready}>
      <div ref={rootRef} className="relative">
        {children}
        {ready && (
          <GlErrorBoundary>
            <Canvas
              flat
              dpr={[1, 1.75]}
              gl={{ antialias: true, alpha: true }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: -1,
                pointerEvents: "none",
                animation: "fadein 1.4s ease-out both",
              }}
              aria-hidden
            >
              <View.Port />
            </Canvas>
          </GlErrorBoundary>
        )}
      </div>
    </GlReadyContext.Provider>
  );
}
