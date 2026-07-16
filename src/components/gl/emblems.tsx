"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useEmblem, EMBLEM } from "./Emblem";

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

/* 01 — VinMart · shelf of stock that comes apart in your hands */
export function ShelfEmblem() {
  const ctl = useEmblem();
  const lacquer = useLacquer();
  const accent = useAccent();
  const refs = useRef<THREE.Mesh[]>([]);

  const boxes = useMemo(() => {
    const out: { home: THREE.Vector3; accent: boolean }[] = [];
    for (let x = -1; x <= 1; x++)
      for (let y = 0; y <= 2; y++)
        for (let z = 0; z <= 1; z++) {
          out.push({
            home: new THREE.Vector3(x * 0.5, y * 0.5 - 0.3, z * 0.5 - 0.25),
            accent: Math.random() < 0.22,
          });
        }
    return out;
  }, []);

  useFrame((state) => {
    if (!ctl.visible) return;
    const h = ctl.hover;
    accent.emissiveIntensity = 0.3 + h * 1.4;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const b = boxes[i];
      const spread = 1 + h * 0.45;
      m.position.set(b.home.x * spread, b.home.y * spread + h * 0.05, b.home.z * spread);
      m.rotation.y = h * Math.sin(i * 1.7 + state.clock.elapsedTime * 0.6) * 0.3;
    });
  });

  return (
    <group>
      {boxes.map((b, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) refs.current[i] = m;
          }}
          position={b.home}
          material={b.accent ? accent : lacquer}
        >
          <boxGeometry args={[0.42, 0.42, 0.42]} />
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
    drop.current.position.y = 0.25 + Math.abs(Math.sin(t * 1.2)) * (0.3 + h * 0.25);
    accent.emissiveIntensity = 0.4 + h * 1.5;
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

/* 03 — Encrypted Images · a cube that scrambles itself */
export function CipherEmblem() {
  const ctl = useEmblem();
  const lacquer = useLacquer();
  const accent = useAccent();
  const refs = useRef<THREE.Mesh[]>([]);

  const voxels = useMemo(() => {
    const out: {
      home: THREE.Vector3;
      scatter: THREE.Vector3;
      spin: number;
      accent: boolean;
    }[] = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          const dir = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
          )
            .normalize()
            .multiplyScalar(0.5 + Math.random() * 0.5);
          out.push({
            home: new THREE.Vector3(x * 0.36, y * 0.36, z * 0.36),
            scatter: dir,
            spin: (Math.random() - 0.5) * 2.4,
            accent: Math.random() < 0.25,
          });
        }
    return out;
  }, []);

  useFrame(() => {
    if (!ctl.visible) return;
    const h = ctl.hover;
    accent.emissiveIntensity = 0.3 + h * 1.6;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const v = voxels[i];
      m.position.set(
        v.home.x + v.scatter.x * h,
        v.home.y + v.scatter.y * h,
        v.home.z + v.scatter.z * h
      );
      m.rotation.set(v.spin * h, v.spin * h * 0.7, 0);
    });
  });

  return (
    <group position={[0, 0.2, 0]}>
      {voxels.map((v, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) refs.current[i] = m;
          }}
          position={v.home}
          material={v.accent ? accent : lacquer}
        >
          <boxGeometry args={[0.3, 0.3, 0.3]} />
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
    accent.emissiveIntensity = 0.3 + h * 1.5;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const idle = 1 + Math.sin(t * 1.1 + i * 0.9) * 0.03;
      const excited = 1 + Math.max(0, Math.sin(t * 2.6 - i * 0.7)) * 0.35 * h;
      m.scale.y = heights[i] * idle * excited;
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
    // constant turntable tempo — hover speaks only through the beat's glow
    disc.current.rotation.y += 0.55 * d;
    const beat = 0.4 + (Math.sin(state.clock.elapsedTime * 4.2) * 0.5 + 0.5) * 1.5 * h;
    accent.emissiveIntensity = beat;
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
    accent.emissiveIntensity = 0.25 + h * 1.1;
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
      steamMats[i].opacity = Math.sin(p * Math.PI) * 0.35 * h;
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
    accent.emissiveIntensity = 0.35 + h * 1.4;
    beamPivots.current.forEach((g, i) => {
      if (!g) return;
      g.rotation.z = Math.sin(t * 0.55 + i * 2.1) * (0.1 + h * 0.24);
      beamMats[i].opacity = 0.06 + h * 0.3;
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
    accent.emissiveIntensity = 0.4 + h * 1.3;

    const L = lane.current;
    if (t > L.nextSwitch) {
      L.target = Math.floor(Math.random() * 3) - 1;
      L.nextSwitch = t + 2.4;
    }
    L.pos = THREE.MathUtils.lerp(L.pos, L.target, 1 - Math.exp(-9 * d));
    runner.current.position.x = L.pos * 0.55;
    runner.current.position.y = 0.28 + Math.abs(Math.sin(t * 3)) * (0.1 + h * 0.12);
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
