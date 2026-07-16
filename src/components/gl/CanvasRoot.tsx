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
import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { pointer, meteorNow } from "./pointer";

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

  useEffect(() => {
    setReady(webglAvailable());
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotion = () => {
      pointer.motion = media.matches ? 0.25 : 1;
    };
    applyMotion();
    media.addEventListener("change", applyMotion);
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    // preview flag for the cloud event, and a small secret: type z-e-n
    pointer.cloudForce = window.location.search.includes("cloud");
    let sequence = "";
    const onKey = (e: KeyboardEvent) => {
      sequence = (sequence + e.key.toLowerCase()).slice(-3);
      if (sequence === "zen") meteorNow();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      media.removeEventListener("change", applyMotion);
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
