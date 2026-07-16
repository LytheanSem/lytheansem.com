"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { View, PerspectiveCamera } from "@react-three/drei";
import { useGlReady } from "./CanvasRoot";
import { pointer } from "./pointer";

/** Mutable per-emblem interaction state, shared with children via context. */
export type EmblemCtl = {
  hoverTarget: number;
  hover: number; // smoothed 0..1 — children read this in useFrame
  targetRx: number;
  targetRy: number;
  dragging: boolean;
  visible: boolean; // wrapper on screen — gates all per-frame work
};

const EmblemContext = createContext<EmblemCtl | null>(null);
export const useEmblem = () => {
  const ctx = useContext(EmblemContext);
  if (!ctx) throw new Error("useEmblem outside EmblemView");
  return ctx;
};

export const EMBLEM = {
  lacquer: "#1c2940",
  lacquerDeep: "#131d2c",
  accent: "#e8622c",
  accentHot: "#ff8c4d",
  paper: "#d8cdb9",
};

function Stage({
  ctl,
  autoRotate,
  children,
}: {
  ctl: EmblemCtl;
  autoRotate: boolean;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null!);
  const born = useRef(-1);

  useFrame((state, dt) => {
    if (!ctl.visible) return;
    const d = Math.min(dt, 0.05);
    const t = state.clock.elapsedTime;
    const m = pointer.motion;
    ctl.hover = THREE.MathUtils.lerp(ctl.hover, ctl.hoverTarget, 1 - Math.exp(-8 * d));
    // hover ignites (emissive) — it must never change the turntable speed
    if (autoRotate && !ctl.dragging) ctl.targetRy += d * 0.22 * m;
    const g = group.current;
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, ctl.targetRy, 1 - Math.exp(-6 * d));
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, ctl.targetRx, 1 - Math.exp(-6 * d));
    // eased entrance the first time the view actually appears on screen
    if (born.current < 0) born.current = t;
    const p = THREE.MathUtils.clamp((t - born.current) / 0.9, 0, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    g.scale.setScalar(0.88 + 0.12 * ease);
    g.position.y = -0.15 * (1 - ease) + Math.sin(t * 0.7) * 0.055 * m;
  });

  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={38}
        position={[0, 1.25, 4.2]}
        onUpdate={(c) => c.lookAt(0, 0.15, 0)}
      />
      <color attach="background" args={["#0c1421"]} />
      <ambientLight intensity={0.7} color="#41506b" />
      <directionalLight position={[3, 4, 2]} intensity={2.6} color="#ffb27d" />
      <directionalLight position={[-4, 2, -3]} intensity={1.7} color="#5f7d9c" />
      {/* rim from behind-below so silhouettes never dissolve into the panel */}
      <directionalLight position={[-2, -1, -4]} intensity={0.9} color="#5f7d9c" />
      <group ref={group} position={[0, -0.15, 0]}>
        {children}
      </group>
    </>
  );
}

/**
 * DOM-driven interactive 3D emblem: hover/focus to ignite, drag or arrow keys
 * to rotate. Interaction lives on the wrapper div (not raycasting) so it stays
 * robust with many scissored views on one canvas. touch-pan-y keeps vertical
 * page scrolling alive on phones.
 */
export default function EmblemView({
  children,
  className = "",
  label,
  autoRotate = true,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
  autoRotate?: boolean;
}) {
  const ready = useGlReady();
  const wrapper = useRef<HTMLDivElement>(null);
  const ctl = useMemo<EmblemCtl>(
    () => ({
      hoverTarget: 0,
      hover: 0,
      targetRx: 0,
      targetRy: autoRotate ? 0.5 : 0,
      dragging: false,
      visible: false,
    }),
    [autoRotate]
  );
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        ctl.visible = entry.isIntersecting;
      },
      { rootMargin: "10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ctl]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    ctl.dragging = true;
    last.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!ctl.dragging) return;
    ctl.targetRy += (e.clientX - last.current.x) * 0.008;
    ctl.targetRx = THREE.MathUtils.clamp(
      ctl.targetRx + (e.clientY - last.current.y) * 0.006,
      -0.6,
      0.6
    );
    last.current = { x: e.clientX, y: e.clientY };
  };
  const endDrag = () => (ctl.dragging = false);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = 0.35;
    if (e.key === "ArrowLeft") ctl.targetRy -= step;
    else if (e.key === "ArrowRight") ctl.targetRy += step;
    else if (e.key === "ArrowUp")
      ctl.targetRx = THREE.MathUtils.clamp(ctl.targetRx - 0.2, -0.6, 0.6);
    else if (e.key === "ArrowDown")
      ctl.targetRx = THREE.MathUtils.clamp(ctl.targetRx + 0.2, -0.6, 0.6);
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={wrapper}
      role="img"
      tabIndex={0}
      aria-label={`${label}. Use arrow keys to rotate.`}
      className={`relative cursor-grab touch-pan-y select-none active:cursor-grabbing ${className}`}
      onPointerEnter={() => (ctl.hoverTarget = 1)}
      onPointerLeave={() => {
        ctl.hoverTarget = 0;
        endDrag();
      }}
      onFocus={() => (ctl.hoverTarget = 1)}
      onBlur={() => (ctl.hoverTarget = 0)}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {ready && (
        <View className="absolute inset-0">
          <EmblemContext.Provider value={ctl}>
            <Stage ctl={ctl} autoRotate={autoRotate}>
              {children}
            </Stage>
          </EmblemContext.Provider>
        </View>
      )}
    </div>
  );
}
