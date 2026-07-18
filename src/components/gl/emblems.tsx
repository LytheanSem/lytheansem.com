"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useEmblem, EMBLEM, pulseStrength } from "./Emblem";

/*
 * Tap pulses — every emblem answers a tap (or Enter) with a one-shot gesture
 * in its own voice. Same envelope grammar as the hero's wind gust: additive
 * on top of the idle animation, never a change to its tempo.
 */

/* Shared material factories — dark lacquer bodies, momiji accents. */
function useLacquer() {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: EMBLEM.lacquer,
        roughness: 0.35,
        metalness: 0.25,
      }),
    []
  );
}

function useAccent() {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: EMBLEM.accent,
        emissive: EMBLEM.accent,
        emissiveIntensity: 0.3,
        roughness: 0.4,
        metalness: 0.1,
      }),
    []
  );
}

/* 01 — VinMart · a stocked supermarket shelf, alive at the edges */
type ShelfProduct = {
  home: THREE.Vector3;
  size: [number, number, number];
  kind: "box" | "can";
  mat: "lacquer" | "accent" | "paper";
  phase: number;
};

export function ShelfEmblem() {
  const ctl = useEmblem();
  const lacquer = useLacquer();
  const accent = useAccent();
  const paper = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c9bda6",
        roughness: 0.65,
        metalness: 0.05,
      }),
    []
  );
  const refs = useRef<THREE.Mesh[]>([]);

  // three stocked shelves: boxes and cans of varied heights, packed left to
  // right with small gaps — the silhouette of every supermarket aisle
  const products = useMemo(() => {
    const out: ShelfProduct[] = [];
    const shelfTops = [-0.62, 0.02, 0.66];
    let i = 0;
    for (const top of shelfTops) {
      let x = -0.82;
      while (x < 0.78) {
        const kind: ShelfProduct["kind"] = Math.random() < 0.55 ? "box" : "can";
        const w = kind === "box" ? 0.16 + Math.random() * 0.16 : 0.12 + Math.random() * 0.04;
        const hgt =
          kind === "box" ? 0.2 + Math.random() * 0.22 : 0.16 + Math.random() * 0.12;
        const roll = Math.random();
        out.push({
          home: new THREE.Vector3(x + w / 2, top + hgt / 2, (Math.random() - 0.5) * 0.12),
          size: [w, hgt, 0.15 + Math.random() * 0.08],
          kind,
          mat: roll < 0.3 ? "accent" : roll < 0.55 ? "paper" : "lacquer",
          phase: i++,
        });
        x += w + 0.04 + Math.random() * 0.05;
      }
    }
    return out;
  }, []);

  useFrame((state) => {
    if (!ctl.visible) return;
    const t = state.clock.elapsedTime;
    const h = ctl.hover;
    const e = pulseStrength(ctl);
    accent.emissiveIntensity = 0.3 + h * 1.3 + e * 1.1;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const p = products[i];
      // tap: a restock wave hops down the aisles, shelf by shelf
      const wavePhase = ((performance.now() - ctl.pulseAt) / 900) * 3.2 - p.home.x * 1.5 - p.home.y * 0.8;
      const hop = e * Math.max(0, Math.sin(wavePhase));
      // hover: the stock leans out to greet you, just slightly
      m.position.set(p.home.x, p.home.y + hop * 0.1, p.home.z + h * 0.05);
      m.rotation.y = (h * 0.5 + e) * Math.sin(p.phase * 1.7 + t * 0.6) * 0.16;
    });
  });

  return (
    <group position={[0, -0.12, 0]}>
      {/* uprights */}
      <mesh position={[-0.96, 0.12, 0]} material={lacquer}>
        <boxGeometry args={[0.07, 2.0, 0.44]} />
      </mesh>
      <mesh position={[0.96, 0.12, 0]} material={lacquer}>
        <boxGeometry args={[0.07, 2.0, 0.44]} />
      </mesh>
      {/* shelf boards, each with a glowing price rail on its lip */}
      {[-0.65, -0.01, 0.63].map((y, i) => (
        <group key={i}>
          <mesh position={[0, y, 0]} material={lacquer}>
            <boxGeometry args={[1.98, 0.06, 0.44]} />
          </mesh>
          <mesh position={[0, y - 0.005, 0.225]} material={accent}>
            <boxGeometry args={[1.98, 0.028, 0.012]} />
          </mesh>
        </group>
      ))}
      {/* the stock */}
      {products.map((p, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) refs.current[i] = m;
          }}
          position={p.home}
          scale={p.kind === "can" ? [p.size[0], p.size[1], p.size[0]] : p.size}
          material={p.mat === "accent" ? accent : p.mat === "paper" ? paper : lacquer}
        >
          {p.kind === "box" ? (
            <boxGeometry args={[1, 1, 1]} />
          ) : (
            <cylinderGeometry args={[0.5, 0.5, 1, 14]} />
          )}
        </mesh>
      ))}
    </group>
  );
}

/* 02 — Ripple · one drop, five expanding rings */
export function RippleEmblem() {
  const ctl = useEmblem();
  const accent = useAccent();
  const rings = useRef<THREE.Mesh[]>([]);
  const mats = useMemo(
    () =>
      Array.from({ length: 4 }, () => {
        const m = new THREE.MeshStandardMaterial({
          color: EMBLEM.accentHot,
          emissive: EMBLEM.accent,
          emissiveIntensity: 0.6,
          transparent: true,
          roughness: 0.5,
        });
        return m;
      }),
    []
  );
  const drop = useRef<THREE.Mesh>(null!);
  const pulseRing = useRef<THREE.Mesh>(null!);
  const pulseMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: EMBLEM.accentHot,
        emissive: EMBLEM.accent,
        emissiveIntensity: 2,
        transparent: true,
        opacity: 0,
        roughness: 0.5,
      }),
    []
  );
  const phase = useRef(0);

  useFrame((state, dt) => {
    if (!ctl.visible) return;
    const t = state.clock.elapsedTime;
    const h = ctl.hover;
    // constant ripple tempo — hover ignites brightness, never pace
    phase.current += Math.min(dt, 0.05) * 0.22;
    rings.current.forEach((mesh, i) => {
      if (!mesh) return;
      const p = (phase.current + i / 4) % 1;
      const r = 0.2 + p * 1.05;
      mesh.scale.set(r, r, r);
      mats[i].opacity = (1 - p) * (0.45 + h * 0.45);
      mats[i].emissiveIntensity = 0.4 + h * 1.2;
    });
    // tap: one extra bright ring — a fifth drop, spreading once and gone
    const pp = (performance.now() - ctl.pulseAt) / 1400;
    if (pp > 0 && pp < 1) {
      const r = 0.2 + pp * 1.35;
      pulseRing.current.scale.set(r, r, r);
      pulseMat.opacity = (1 - pp) * 0.9;
    } else {
      pulseMat.opacity = 0;
    }
    drop.current.position.y = 0.25 + Math.abs(Math.sin(t * 1.2)) * (0.3 + h * 0.25);
    accent.emissiveIntensity = 0.4 + h * 1.5 + pulseStrength(ctl) * 1.2;
  });

  return (
    <group rotation-x={0.12} position={[0, 0.1, 0]}>
      {mats.map((m, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) rings.current[i] = el;
          }}
          rotation-x={-Math.PI / 2}
          material={m}
        >
          <torusGeometry args={[1, 0.02, 10, 64]} />
        </mesh>
      ))}
      <mesh ref={pulseRing} rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} material={pulseMat}>
        <torusGeometry args={[1, 0.03, 10, 64]} />
      </mesh>
      <mesh ref={drop} position={[0, 0.4, 0]} material={accent}>
        <sphereGeometry args={[0.14, 20, 16]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
        <circleGeometry args={[1.42, 48]} />
        <meshStandardMaterial color={EMBLEM.lacquerDeep} roughness={0.2} metalness={0.5} />
      </mesh>
    </group>
  );
}

/* 03 — Encrypted Images · a photograph that keeps its secret */
const PHOTO_W = 1.5;
const PHOTO_H = 1.06;
const PHOTO_COLS = 8;
const PHOTO_ROWS = 6;

type PhotoTile = {
  home: THREE.Vector3;
  photo: THREE.Color;
  cipher: THREE.Color;
  scatter: THREE.Vector3;
  spin: number;
  lag: number;
};

export function CipherEmblem() {
  const ctl = useEmblem();
  const sway = useRef<THREE.Group>(null!);
  const refs = useRef<THREE.Mesh[]>([]);

  // the picture is a tiny mosaic of this site's own night field — sky, moon,
  // a momiji canopy, the dark ground. Each tile also carries its ciphertext
  // face: cold noise, no image left in it.
  const tiles = useMemo(() => {
    const out: PhotoTile[] = [];
    const skyLo = new THREE.Color("#31435f");
    const skyHi = new THREE.Color("#1a2740");
    const moon = new THREE.Color("#dde6f2");
    const ground = new THREE.Color("#10192a");
    const canopy = new THREE.Color("#d0592c");
    for (let r = 0; r < PHOTO_ROWS; r++) {
      for (let c = 0; c < PHOTO_COLS; c++) {
        const u = (c + 0.5) / PHOTO_COLS;
        const v = (r + 0.5) / PHOTO_ROWS;
        let col: THREE.Color;
        if (v < 0.3) col = ground.clone();
        else col = skyLo.clone().lerp(skyHi, (v - 0.3) / 0.7);
        // the moon, upper right — with a soft halo in the surrounding tiles
        const moonDist = Math.hypot((u - 0.72) * 1.35, v - 0.7);
        if (moonDist < 0.3) col.lerp(moon, 0.3 * (1 - moonDist / 0.3));
        if (moonDist < 0.14) col = moon.clone();
        // a maple canopy leaning in from the left
        if (u < 0.3 && v > 0.28 && v < 0.62 && Math.random() < 0.85)
          col = canopy.clone().lerp(ground, Math.random() * 0.4);
        col.offsetHSL(0, 0, (Math.random() - 0.5) * 0.03); // mosaic grain
        out.push({
          home: new THREE.Vector3((u - 0.5) * PHOTO_W, (v - 0.5) * PHOTO_H + 0.07, 0.03),
          photo: col,
          cipher: new THREE.Color().setHSL(0.58 + Math.random() * 0.05, 0.12, 0.1 + Math.random() * 0.22),
          scatter: new THREE.Vector3(
            (Math.random() - 0.5) * 1.7,
            (Math.random() - 0.5) * 1.3,
            0.25 + Math.random() * 0.85
          ),
          spin: (Math.random() - 0.5) * 3.2,
          lag: Math.random() * 0.22,
        });
      }
    }
    return out;
  }, []);

  const mats = useMemo(
    () => tiles.map((t) => new THREE.MeshBasicMaterial({ color: t.photo.clone(), side: THREE.DoubleSide })),
    [tiles]
  );

  useFrame((state) => {
    if (!ctl.visible) return;
    const t = state.clock.elapsedTime;
    const h = ctl.hover;
    const e = pulseStrength(ctl);
    // encryption amount: hover lifts the image into a shimmer of ciphertext,
    // a tap runs the full encrypt-and-decrypt cycle; the empty polaroid paper
    // stays behind while the image is away
    const k = Math.min(1.2, h * 0.5 + e);
    refs.current.forEach((m, i) => {
      if (!m) return;
      const tl = tiles[i];
      const kk = THREE.MathUtils.clamp(k * 1.3 - tl.lag, 0, 1);
      m.position.set(
        tl.home.x + tl.scatter.x * kk,
        tl.home.y + tl.scatter.y * kk,
        tl.home.z + tl.scatter.z * kk
      );
      m.rotation.set(tl.spin * kk, tl.spin * kk * 0.8, tl.spin * kk * 0.3);
      mats[i].color.copy(tl.photo).lerp(tl.cipher, kk);
    });
    // a photograph hangs and sways — it never turns its back
    sway.current.rotation.y = Math.sin(t * 0.4) * 0.24;
    sway.current.rotation.x = Math.sin(t * 0.27) * 0.05;
  });

  return (
    <group ref={sway} position={[0, 0.28, 0]}>
      {/* polaroid paper: deep bottom margin, thin elsewhere */}
      <mesh position={[0, -0.04, -0.02]}>
        <boxGeometry args={[1.68, 1.42, 0.04]} />
        {/* unlit: polaroid paper stays paper-pale under the warm stage light */}
        <meshBasicMaterial color="#ddd5c2" />
      </mesh>
      {/* the image, tile by tile */}
      {tiles.map((tl, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) refs.current[i] = m;
          }}
          position={tl.home}
          material={mats[i]}
        >
          <planeGeometry args={[(PHOTO_W / PHOTO_COLS) * 0.96, (PHOTO_H / PHOTO_ROWS) * 0.95]} />
        </mesh>
      ))}
    </group>
  );
}

/* 04 — KH-Track · a ledger of rising bars */
export function BarsEmblem() {
  const ctl = useEmblem();
  const lacquer = useLacquer();
  const accent = useAccent();
  const refs = useRef<THREE.Mesh[]>([]);
  const heights = useMemo(() => [0.5, 0.85, 0.65, 1.15, 0.9, 1.5], []);

  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(0.34, 1, 0.34);
    g.translate(0, 0.5, 0);
    return g;
  }, []);

  useFrame((state) => {
    if (!ctl.visible) return;
    const t = state.clock.elapsedTime;
    const h = ctl.hover;
    const e = pulseStrength(ctl);
    accent.emissiveIntensity = 0.3 + h * 1.5 + e * 1.2;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const idle = 1 + Math.sin(t * 1.1 + i * 0.9) * 0.03;
      const excited = 1 + Math.max(0, Math.sin(t * 2.6 - i * 0.7)) * 0.35 * h;
      // tap: a good day at the ledger — one surge sweeps left to right, once:
      // each bar rides only the first half-period of its wave, no echoes
      const ph = (performance.now() - ctl.pulseAt) / 300 - i * 0.55;
      const crest = ph > 0 && ph < Math.PI ? e * Math.sin(ph) : 0;
      m.scale.y = heights[i] * idle * excited * (1 + crest * 0.45);
    });
  });

  return (
    <group position={[-0.05, -0.45, 0]}>
      {heights.map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) refs.current[i] = m;
          }}
          geometry={geometry}
          position={[(i - 2.5) * 0.46, 0, 0]}
          material={i === 3 || i === 5 ? accent : lacquer}
        />
      ))}
      <mesh position={[0, -0.03, 0]}>
        <boxGeometry args={[3.1, 0.06, 0.9]} />
        <meshStandardMaterial color={EMBLEM.lacquerDeep} roughness={0.3} metalness={0.4} />
      </mesh>
    </group>
  );
}

/* 05 — Drift · a record that spins up after midnight */
export function DiscEmblem() {
  const ctl = useEmblem();
  const accent = useAccent();
  const disc = useRef<THREE.Group>(null!);

  useFrame((state, dt) => {
    if (!ctl.visible) return;
    const d = Math.min(dt, 0.05);
    const h = ctl.hover;
    const e = pulseStrength(ctl); // tap: the needle drops — one hard beat, a breath of scale
    // constant turntable tempo — hover speaks only through the beat's glow
    disc.current.rotation.y += 0.55 * d;
    const beat = 0.4 + (Math.sin(state.clock.elapsedTime * 4.2) * 0.5 + 0.5) * 1.5 * h;
    accent.emissiveIntensity = beat + e * 1.8;
    disc.current.scale.setScalar(1 + e * 0.045);
  });

  return (
    <group rotation={[0.3, 0, -0.05]} position={[0, 0.25, 0]}>
      <group ref={disc}>
        <mesh>
          <cylinderGeometry args={[1.15, 1.15, 0.07, 56]} />
          <meshStandardMaterial color="#111926" roughness={0.25} metalness={0.55} />
        </mesh>
        {[0.5, 0.68, 0.86, 1.02].map((r, i) => (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[0, 0.042, 0]}>
            <torusGeometry args={[r, 0.007, 6, 72]} />
            <meshStandardMaterial color="#3d5677" roughness={0.35} metalness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 0.05, 0]} material={accent}>
          <cylinderGeometry args={[0.36, 0.36, 0.03, 36]} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.07, 12]} />
          <meshStandardMaterial color={EMBLEM.paper} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

/* 06 — Eleven One Kitchen · a warm bowl, steam rising */
export function BowlEmblem() {
  const ctl = useEmblem();
  const accent = useAccent();
  const steam = useRef<THREE.Mesh[]>([]);
  const steamMats = useMemo(
    () =>
      Array.from({ length: 4 }, () => {
        return new THREE.MeshBasicMaterial({
          color: "#cfd8e6",
          transparent: true,
          opacity: 0,
        });
      }),
    []
  );

  const bowlGeometry = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * Math.PI * 0.52;
      pts.push(new THREE.Vector2(Math.sin(a) * 0.95, (1 - Math.cos(a)) * 0.85 - 0.02));
    }
    return new THREE.LatheGeometry(pts, 40);
  }, []);

  useFrame((state) => {
    if (!ctl.visible) return;
    const t = state.clock.elapsedTime;
    const h = ctl.hover;
    const e = pulseStrength(ctl); // tap: the bowl exhales — a denser breath of steam
    accent.emissiveIntensity = 0.25 + h * 1.1 + e * 0.9;
    steam.current.forEach((m, i) => {
      if (!m) return;
      const p = (t * 0.32 + i / 4) % 1;
      m.position.set(
        Math.sin(p * 7 + i * 2.1) * 0.18,
        0.95 + p * 1.0,
        Math.cos(p * 5 + i) * 0.12
      );
      const s = 0.5 + p * 0.9;
      m.scale.setScalar(s);
      steamMats[i].opacity = Math.sin(p * Math.PI) * 0.35 * Math.min(1, h + e * 1.6);
    });
  });

  return (
    <group position={[0, -0.3, 0]} scale={0.95}>
      <mesh geometry={bowlGeometry}>
        <meshStandardMaterial color="#16202f" roughness={0.25} metalness={0.35} side={THREE.DoubleSide} />
      </mesh>
      {/* glowing broth surface */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.72, 0]} material={accent}>
        <circleGeometry args={[0.82, 40]} />
      </mesh>
      {/* momiji lacquer rim */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.86, 0]}>
        <torusGeometry args={[0.94, 0.04, 12, 48]} />
        <meshStandardMaterial color={EMBLEM.accent} emissive={EMBLEM.accent} emissiveIntensity={0.25} roughness={0.4} />
      </mesh>
      {/* chopsticks resting across the rim */}
      <group position={[0.15, 0.94, 0]} rotation={[0, 0.35, 0.05]}>
        <mesh rotation-z={Math.PI / 2} position={[0, 0, 0.07]}>
          <cylinderGeometry args={[0.022, 0.03, 2.2, 8]} />
          <meshStandardMaterial color={EMBLEM.paper} roughness={0.6} />
        </mesh>
        <mesh rotation-z={Math.PI / 2} position={[0, 0, -0.07]}>
          <cylinderGeometry args={[0.022, 0.03, 2.2, 8]} />
          <meshStandardMaterial color={EMBLEM.paper} roughness={0.6} />
        </mesh>
      </group>
      {steamMats.map((m, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) steam.current[i] = el;
          }}
          material={m}
        >
          <sphereGeometry args={[0.09, 10, 8]} />
        </mesh>
      ))}
      <pointLight position={[0, 0.9, 0]} intensity={1.2} color={EMBLEM.accentHot} distance={3} />
    </group>
  );
}

/* 02 — EmotionWork · a concert stage, spotlights sweeping */
export function StageEmblem() {
  const ctl = useEmblem();
  const lacquer = useLacquer();
  const accent = useAccent();
  const beamPivots = useRef<THREE.Group[]>([]);
  const beamMats = useMemo(
    () =>
      Array.from(
        { length: 3 },
        () =>
          new THREE.MeshBasicMaterial({
            color: "#ffb27d",
            transparent: true,
            opacity: 0.06,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
      ),
    []
  );

  useFrame((state) => {
    if (!ctl.visible) return;
    const t = state.clock.elapsedTime;
    const h = ctl.hover;
    const e = pulseStrength(ctl); // tap: the drop hits — beams flare and sweep wide
    accent.emissiveIntensity = 0.35 + h * 1.4 + e * 1.2;
    beamPivots.current.forEach((g, i) => {
      if (!g) return;
      // amplitude widens on the pulse; the sweep's tempo never changes
      g.rotation.z = Math.sin(t * 0.55 + i * 2.1) * (0.1 + h * 0.24 + e * 0.3);
      beamMats[i].opacity = 0.06 + h * 0.3 + e * 0.35;
    });
  });

  return (
    <group position={[0, -0.55, 0]}>
      {/* stage deck with glowing lip */}
      <mesh position={[0, 0.12, 0]} material={lacquer}>
        <boxGeometry args={[2.6, 0.24, 1.5]} />
      </mesh>
      <mesh position={[0, 0.12, 0.76]} material={accent}>
        <boxGeometry args={[2.6, 0.04, 0.02]} />
      </mesh>
      {/* truss */}
      <mesh position={[-1.32, 1.15, 0]} material={lacquer}>
        <boxGeometry args={[0.08, 2.1, 0.08]} />
      </mesh>
      <mesh position={[1.32, 1.15, 0]} material={lacquer}>
        <boxGeometry args={[0.08, 2.1, 0.08]} />
      </mesh>
      <mesh position={[0, 2.16, 0]} material={lacquer}>
        <boxGeometry args={[2.8, 0.09, 0.09]} />
      </mesh>
      {/* spotlights: fixture + swiveling beam cone */}
      {[-0.8, 0, 0.8].map((x, i) => (
        <group key={i} position={[x, 2.08, 0]}>
          <mesh material={accent}>
            <boxGeometry args={[0.15, 0.15, 0.15]} />
          </mesh>
          <group
            ref={(g) => {
              if (g) beamPivots.current[i] = g;
            }}
          >
            <mesh position={[0, -0.92, 0]} material={beamMats[i]}>
              <coneGeometry args={[0.45, 1.8, 20, 1, true]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/* 08 — LaneDash · three lanes, a runner dashing between them */
export function LanesEmblem() {
  const ctl = useEmblem();
  const lacquer = useLacquer();
  const accent = useAccent();
  const runner = useRef<THREE.Mesh>(null!);
  const obstacles = useRef<THREE.Mesh[]>([]);
  const lane = useRef({ pos: 0, target: 0, nextSwitch: 2 });
  const dist = useRef(0);

  const obstacleData = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        lane: Math.floor(Math.random() * 3) - 1,
        offset: i * 1.5,
      })),
    []
  );

  useFrame((state, dt) => {
    if (!ctl.visible) return;
    const t = state.clock.elapsedTime;
    const d = Math.min(dt, 0.05);
    const h = ctl.hover;
    // constant run tempo — hover ignites the runner, never the clock
    dist.current += d * 1.1;
    accent.emissiveIntensity = 0.4 + h * 1.3 + pulseStrength(ctl) * 1.2;

    const L = lane.current;
    if (t > L.nextSwitch) {
      L.target = Math.floor(Math.random() * 3) - 1;
      L.nextSwitch = t + 2.4;
    }
    L.pos = THREE.MathUtils.lerp(L.pos, L.target, 1 - Math.exp(-9 * d));
    runner.current.position.x = L.pos * 0.55;
    // tap: the runner leaps — one proud jump over the stream, pace untouched
    runner.current.position.y =
      0.28 + Math.abs(Math.sin(t * 3)) * (0.1 + h * 0.12) + pulseStrength(ctl) * 0.4;
    runner.current.rotation.x = -0.25 * (dist.current % (Math.PI * 2));

    obstacles.current.forEach((m, i) => {
      if (!m) return;
      const o = obstacleData[i];
      const z = ((o.offset + dist.current) % 7.2) - 5.4;
      m.position.set(o.lane * 0.55, 0.16, z);
    });
  });

  return (
    <group position={[0, -0.4, 0.3]} rotation-y={0.4}>
      {/* three lanes */}
      {[-1, 0, 1].map((l) => (
        <mesh key={l} position={[l * 0.55, 0, -1.4]} material={lacquer}>
          <boxGeometry args={[0.48, 0.07, 5.6]} />
        </mesh>
      ))}
      {/* lane edge glow strips */}
      {[-0.82, 0.82].map((x, i) => (
        <mesh key={i} position={[x, 0.02, -1.4]} material={accent}>
          <boxGeometry args={[0.02, 0.05, 5.6]} />
        </mesh>
      ))}
      {/* the runner */}
      <mesh ref={runner} position={[0, 0.28, 1.2]} material={accent}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
      </mesh>
      {/* obstacles streaming past */}
      {obstacleData.map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) obstacles.current[i] = m;
          }}
          material={lacquer}
        >
          <boxGeometry args={[0.34, 0.26, 0.26]} />
        </mesh>
      ))}
    </group>
  );
}

export const emblemMap = {
  shelf: ShelfEmblem,
  stage: StageEmblem,
  ripple: RippleEmblem,
  cipher: CipherEmblem,
  bars: BarsEmblem,
  disc: DiscEmblem,
  bowl: BowlEmblem,
  lanes: LanesEmblem,
} as const;
