"use client";

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, useGLTF, useAnimations } from "@react-three/drei";
import { pointer, gustStrength, gustAtX, gustLive, cloudCover } from "./pointer";

/* ---------------------------------- utils --------------------------------- */

const leafStops = ["#6f2013", "#a53318", "#c2431f", "#e8622c", "#ef7a37", "#ff9c52"].map(
  (c) => new THREE.Color(c)
);

function leafColor(t: number, out: THREE.Color) {
  const f = THREE.MathUtils.clamp(t, 0, 0.999) * (leafStops.length - 1);
  const i = Math.floor(f);
  return out.copy(leafStops[i]).lerp(leafStops[i + 1], f - i);
}

function makeRadialTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function makeVerticalGradientTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.45, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 128);
  return new THREE.CanvasTexture(canvas);
}

/** Pointed momiji-leaf silhouette — shared by canopy and falling leaves. */
function makeLeafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.1);
  s.quadraticCurveTo(0.075, -0.02, 0.015, 0.1);
  s.quadraticCurveTo(0, 0.06, -0.015, 0.1);
  s.quadraticCurveTo(-0.075, -0.02, 0, -0.1);
  return new THREE.ShapeGeometry(s, 4);
}

const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

/* ----------------------------------- sky ---------------------------------- */

const skyVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;      // tonight's real lunar phase, 0 = new, 0.5 = full
  uniform float uCloud;      // 0..1 cloud-over-the-moon (scheduled in JS)
  uniform float uMeteorStart; // clock time of a summoned meteor, or -100
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  // a single meteor streak: seed picks the path, t0 its start time
  vec3 meteor(vec2 uvA, float seed, float t0) {
    float life = 0.9;
    float p = (uTime - t0) / life;
    if (p <= 0.0 || p >= 1.0) return vec3(0.0);
    vec2 start = vec2(0.5 + hash(vec2(seed, 1.7)) * 1.1, 0.86 + hash(vec2(seed, 3.1)) * 0.07);
    vec2 dir = normalize(vec2(0.6, -0.2 - hash(vec2(seed, 5.2)) * 0.12));
    vec2 head = start + dir * p * 0.55;
    vec2 rel = uvA - head;
    float along = clamp(dot(rel, -dir), 0.0, 0.12 * (1.0 - p));
    float dLine = length(rel + dir * along);
    float streak = exp(-dLine * 480.0) * (1.0 - p) * (0.4 + 0.6 * smoothstep(0.0, 0.15, p));
    return vec3(0.85, 0.9, 1.0) * streak * 1.5;
  }

  void main() {
    vec2 uv = vUv;
    vec3 deep = vec3(0.018, 0.035, 0.072);
    vec3 dusk = vec3(0.085, 0.13, 0.215);
    vec3 haze = vec3(0.32, 0.41, 0.57);

    vec3 col = mix(dusk, deep, smoothstep(0.42, 0.95, uv.y));

    // cool moonlit haze pooling near the horizon
    float horiz = smoothstep(0.68, 0.28, uv.y);
    float cx = 1.0 - min(abs(uv.x - 0.56) * 1.6, 1.0);
    col = mix(col, haze, horiz * cx * 0.34);

    // the moon — tonight's REAL phase: a proper terminator from uPhase,
    // clamped so even a new moon stays legible in the composition
    float breathe = 1.0 + 0.02 * sin(uTime * 0.25);
    vec2 d = (uv - vec2(0.56, 0.63)) * vec2(70.0 / 30.0, 1.0);
    float dist = length(d);
    float disc = 1.0 - smoothstep(0.040, 0.0445, dist);
    vec3 moonCol = vec3(0.84, 0.89, 0.97);
    float maria = noise(d * 48.0 + 3.7) + 0.55 * noise(d * 105.0 + 9.2);
    moonCol -= vec3(0.24, 0.22, 0.17) * smoothstep(0.42, 0.95, maria);
    // sphere normal from the disc offset; sun direction from the phase angle
    vec2 nd = d / 0.0445;
    float nz = sqrt(max(0.0, 1.0 - dot(nd, nd)));
    float theta = uPhase * 6.2831853;
    vec3 sunDir = normalize(vec3(sin(theta), 0.18, -cos(theta)));
    float lit = smoothstep(-0.04, 0.1, dot(vec3(nd, nz), sunDir));
    float shade = mix(0.38, 1.0, lit); // artistic clamp — never fully dark
    moonCol *= shade;
    // cloud passing over: an fbm wisp occludes disc, halo, and nearby stars
    float wisp = 0.55 + 0.45 * noise(vec2(uv.x * 9.0 - uTime * 0.10, uv.y * 18.0 + uTime * 0.02));
    float occ = uCloud * wisp * smoothstep(0.34, 0.05, dist);
    col = mix(col, moonCol, disc * 0.97 * (1.0 - occ * 0.75));
    float phaseGlow = mix(0.5, 1.0, 0.5 - 0.5 * cos(theta)); // halo follows illumination
    col += vec3(0.55, 0.66, 0.88) * exp(-dist * 8.5) * 0.32 * breathe * (1.0 - disc) * (1.0 - occ * 0.85) * phaseGlow;
    col += vec3(0.30, 0.40, 0.62) * exp(-dist * 2.4) * 0.2 * breathe * (1.0 - occ * 0.7) * phaseGlow;
    // the veil itself, faintly visible against the glow
    col = mix(col, vec3(0.16, 0.22, 0.34), occ * 0.35);

    // shooting stars: a rare scheduled one, and one summoned by those who know
    vec2 uvA = uv * vec2(70.0 / 30.0, 1.0);
    float period = 53.0;
    float cycle = floor(uTime / period);
    float skyMask = smoothstep(0.6, 0.68, uv.y) * smoothstep(0.13, 0.22, dist);
    if (hash(vec2(cycle, 9.4)) > 0.45) {
      col += meteor(uvA, cycle, cycle * period + 2.0 + hash(vec2(cycle, 2.2)) * 6.0) * skyMask;
    }
    col += meteor(uvA, uMeteorStart, uMeteorStart) * skyMask;

    // sparse twinkling stars — high sky only, hushed near the moon's halo
    vec2 starGrid = uv * vec2(140.0, 60.0);
    float seed = hash(floor(starGrid));
    float isStar = smoothstep(0.9965, 1.0, seed);
    float point = smoothstep(0.3, 0.0, length(fract(starGrid) - 0.5));
    float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + seed * 2.5) + seed * 43.0);
    col += vec3(0.72, 0.8, 0.95) * isStar * point * twinkle * 0.5
         * smoothstep(0.48, 0.78, uv.y) * smoothstep(0.1, 0.28, dist);

    // slow mist streaks
    float m = noise(vec2(uv.x * 4.0 + uTime * 0.008, uv.y * 9.0));
    m += 0.5 * noise(vec2(uv.x * 9.0 - uTime * 0.012, uv.y * 16.0));
    col = mix(col, vec3(0.36, 0.45, 0.60), m * 0.11 * smoothstep(0.8, 0.25, uv.y));

    // vignette + dither
    col *= mix(0.8, 1.0, smoothstep(1.3, 0.35, length(uv - vec2(0.5, 0.48))));
    col += (hash(gl_FragCoord.xy) - 0.5) * (6.0 / 255.0);

    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Tonight's lunar phase: 0 = new, 0.5 = full (synodic month from a known new moon). */
function lunarPhase() {
  const SYNODIC = 29.530588853;
  const KNOWN_NEW = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const days = Date.now() / 86400000 - KNOWN_NEW;
  return ((days % SYNODIC) + SYNODIC) % SYNODIC / SYNODIC;
}

function Sky() {
  const mat = useRef<THREE.ShaderMaterial>(null!);
  const meteorLatch = useRef(-10000);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPhase: { value: lunarPhase() },
      uCloud: { value: 0 },
      uMeteorStart: { value: -100 },
    }),
    []
  );
  useFrame((state) => {
    const u = mat.current.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uCloud.value = cloudCover(state.clock.elapsedTime);
    // translate a summoned meteor's wall-clock trigger into shader time, once
    if (pointer.meteorAt !== meteorLatch.current) {
      meteorLatch.current = pointer.meteorAt;
      u.uMeteorStart.value = state.clock.elapsedTime + 0.05;
    }
  });
  return (
    <mesh position={[0, 3, -20]}>
      <planeGeometry args={[70, 30]} />
      <shaderMaterial
        ref={mat}
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
        uniforms={uniforms}
        fog={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ------------------------------ ground & grass ----------------------------- */

function Ground() {
  const glowTex = useMemo(makeRadialTexture, []);
  const moonPool = useRef<THREE.MeshBasicMaterial>(null!);

  useFrame((state) => {
    if (!pointer.heroVisible) return;
    // the field reflection breathes with the halo — and fades under a cloud
    const t = state.clock.elapsedTime;
    moonPool.current.opacity =
      0.22 * (1 + 0.15 * Math.sin(t * 0.25)) * (1 - 0.6 * cloudCover(t));
  });

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -1.2, -4]}>
        <planeGeometry args={[90, 44]} />
        <meshBasicMaterial color="#0a1019" />
      </mesh>
      {/* ember glow pooling on the field — warm counterpoint to the cold moon */}
      <mesh rotation-x={-Math.PI / 2} position={[1.4, -1.19, 0.4]}>
        <planeGeometry args={[9, 5]} />
        <meshBasicMaterial
          map={glowTex}
          color="#b5511f"
          transparent
          opacity={0.26}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* faint moonlight pool on the field below the moon */}
      <mesh rotation-x={-Math.PI / 2} position={[0.2, -1.195, -6]}>
        <planeGeometry args={[14, 8]} />
        <meshBasicMaterial
          ref={moonPool}
          map={glowTex}
          color="#3a4d6e"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function GrassBand({ count, z, phase }: { count: number; z: number; phase: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.014, 0.36);
    g.translate(0, 0.18, 0);
    return g;
  }, []);

  const { matrices, colors } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 26;
      const zz = z + (Math.random() - 0.5) * 1.6;
      dummy.position.set(x, -1.24, zz);
      dummy.rotation.set(0, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.28);
      const s = 0.45 + Math.random() * 0.75;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());

      // blades near the ember pool catch fire-light; the rest stay ink
      const emberChance = 0.08 + 0.3 * Math.exp(-((x - 1.4) ** 2) / 7);
      if (Math.random() < emberChance) {
        color.set("#7c2f12").lerp(new THREE.Color("#e07430"), Math.random());
      } else {
        color.set("#0a111c").lerp(new THREE.Color("#152237"), Math.random());
      }
      colors.push(color.clone());
    }
    return { matrices, colors };
  }, [count, z]);

  const group = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!pointer.heroVisible) return;
    // idle sway only — as a SHEAR so blades bend from their own roots (tips
    // move, roots stay planted at y=-1.22). Deliberately does NOT respond to
    // the click-gust: the owner wants the wind to stir the leaves alone.
    const k = Math.sin(state.clock.elapsedTime * 0.7 + phase) * 0.035 * pointer.motion;
    group.current.matrix.set(1, k, 0, k * 1.22, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  });

  return (
    <group ref={group} matrixAutoUpdate={false}>
      <instancedMesh
        ref={(m) => {
          if (!m || m.userData.done) return;
          matrices.forEach((mat, i) => m.setMatrixAt(i, mat));
          colors.forEach((c, i) => m.setColorAt(i, c));
          m.instanceMatrix.needsUpdate = true;
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
          m.userData.done = true;
        }}
        args={[geometry, undefined, count]}
      >
        <meshBasicMaterial side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

function Grass() {
  const mobile = useMemo(isMobile, []);
  const n = mobile ? 190 : 380;
  return (
    <>
      <GrassBand count={n} z={1.6} phase={0} />
      <GrassBand count={n} z={2.8} phase={2.1} />
      <GrassBand count={Math.floor(n * 0.85)} z={3.9} phase={4.2} />
    </>
  );
}

/* -------------------------------- maple tree ------------------------------- */

const CANOPY_BLOBS: { c: [number, number, number]; r: number }[] = [
  { c: [0.5, 3.5, 0], r: 1.6 },
  { c: [1.8, 3.0, 0.3], r: 1.25 },
  { c: [-0.9, 3.0, -0.2], r: 1.05 },
  { c: [1.0, 2.4, 0.4], r: 0.95 },
  { c: [2.8, 2.6, 0], r: 0.8 },
];

function MapleTree() {
  const mobile = useMemo(isMobile, []);
  const count = mobile ? 550 : 1150;
  const canopy = useRef<THREE.Group>(null!);

  const geometry = useMemo(makeLeafGeometry, []);

  const { matrices, colors } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    const totalR = CANOPY_BLOBS.reduce((s, b) => s + b.r ** 3, 0);
    for (let i = 0; i < count; i++) {
      let pick = Math.random() * totalR;
      let blob = CANOPY_BLOBS[0];
      for (const b of CANOPY_BLOBS) {
        pick -= b.r ** 3;
        if (pick <= 0) {
          blob = b;
          break;
        }
      }
      // uniform-ish point in flattened sphere
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        (Math.random() * 2 - 1) * 0.72,
        Math.random() * 2 - 1
      ).normalize();
      const rad = blob.r * Math.cbrt(Math.random());
      dummy.position.set(
        blob.c[0] + dir.x * rad,
        blob.c[1] + dir.y * rad * 0.75,
        blob.c[2] + dir.z * rad * 0.6
      );
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const s = 0.85 + Math.random() * 0.9;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());

      // brighter toward the sun (screen-right of the canopy)
      const sunBias = THREE.MathUtils.clamp((dummy.position.x + 1) / 4.2, 0, 1);
      leafColor(sunBias * 0.55 + Math.random() * 0.45, color);
      colors.push(color.clone());
    }
    return { matrices, colors };
  }, [count]);

  useFrame((state) => {
    if (!pointer.heroVisible) return;
    // idle sway only — the click-gust is for the leaves, not the tree
    canopy.current.rotation.z =
      Math.sin(state.clock.elapsedTime * 0.4) * 0.01 * pointer.motion;
  });

  return (
    <group position={[-4.1, -1.2, -3.5]}>
      {/* trunk + branches */}
      <mesh position={[0, 1.3, 0]} rotation-z={0.16}>
        <cylinderGeometry args={[0.07, 0.2, 2.7, 7]} />
        <meshBasicMaterial color="#05080d" />
      </mesh>
      <mesh position={[0.7, 2.5, 0]} rotation-z={-0.9}>
        <cylinderGeometry args={[0.035, 0.07, 1.7, 6]} />
        <meshBasicMaterial color="#05080d" />
      </mesh>
      <mesh position={[-0.5, 2.3, -0.1]} rotation-z={0.7}>
        <cylinderGeometry args={[0.03, 0.06, 1.3, 6]} />
        <meshBasicMaterial color="#05080d" />
      </mesh>
      <group ref={canopy}>
        <instancedMesh
          ref={(m) => {
            if (!m || m.userData.done) return;
            matrices.forEach((mat, i) => m.setMatrixAt(i, mat));
            colors.forEach((c, i) => m.setColorAt(i, c));
            m.instanceMatrix.needsUpdate = true;
            if (m.instanceColor) m.instanceColor.needsUpdate = true;
            m.userData.done = true;
          }}
          args={[geometry, undefined, count]}
        >
          <meshBasicMaterial side={THREE.DoubleSide} />
        </instancedMesh>
      </group>
    </group>
  );
}

/* ------------------------------ falling leaves ----------------------------- */

type LeafState = {
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
  scale: number;
};

function spawnLeaf(l: LeafState, initial: boolean) {
  const nearTree = Math.random() < 0.6;
  l.x = nearTree ? -7 + Math.random() * 6 : -9 + Math.random() * 15;
  l.y = initial ? -1 + Math.random() * 8 : 3.5 + Math.random() * 4;
  l.z = -4.5 + Math.random() * 7;
  l.speed = 0.3 + Math.random() * 0.5;
  l.phase = Math.random() * Math.PI * 2;
  l.rx = Math.random() * Math.PI;
  l.ry = Math.random() * Math.PI;
  l.rz = Math.random() * Math.PI;
  l.sx = (0.5 + Math.random() * 1.3) * (Math.random() < 0.5 ? -1 : 1);
  l.sy = 0.5 + Math.random() * 1.3;
  l.sz = (0.5 + Math.random() * 1.3) * (Math.random() < 0.5 ? -1 : 1);
  l.scale = 0.5 + Math.random() * 0.45;
}

function FallingLeaves() {
  const mobile = useMemo(isMobile, []);
  const count = mobile ? 50 : 90;
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(makeLeafGeometry, []);

  const leaves = useMemo(() => {
    const arr: LeafState[] = [];
    for (let i = 0; i < count; i++) {
      const l = {} as LeafState;
      spawnLeaf(l, true);
      arr.push(l);
    }
    return arr;
  }, [count]);

  const colors = useMemo(() => {
    const color = new THREE.Color();
    return leaves.map(() => leafColor(0.35 + Math.random() * 0.65, color).clone());
  }, [leaves]);

  useFrame((state, dt) => {
    if (!pointer.heroVisible) return;
    const d = Math.min(dt, 0.05) * pointer.motion;
    const t = state.clock.elapsedTime;
    const live = gustLive();
    const baseWind = 0.38 + pointer.x * 0.55;

    const m = mesh.current;
    for (let i = 0; i < leaves.length; i++) {
      const l = leaves[i];
      // the gust radiates from where the visitor touched — each leaf feels
      // the wind only when the front reaches its position
      const gust = live ? gustAtX(l.x) * 3.4 : 0;
      const wind = baseWind + gust;
      l.y -= l.speed * d * (1 + gust * 0.12);
      l.x += wind * d + Math.sin(t * 1.3 + l.phase) * 0.4 * d;
      l.y += Math.sin(t * 2.1 + l.phase) * 0.14 * d;
      const spin = d * (1 + gust * 0.4);
      l.rx += l.sx * spin;
      l.ry += l.sy * spin;
      l.rz += l.sz * spin;
      if (l.y < -1.45 || l.x > 13) spawnLeaf(l, false);

      dummy.position.set(l.x, l.y, l.z);
      dummy.rotation.set(l.rx, l.ry, l.rz);
      dummy.scale.setScalar(l.scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={(m) => {
        mesh.current = m as THREE.InstancedMesh;
        if (!m || m.userData.done) return;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        colors.forEach((c, i) => m.setColorAt(i, c));
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
        m.userData.done = true;
      }}
      args={[geometry, undefined, count]}
      frustumCulled={false}
    >
      <meshBasicMaterial side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/* ------------------------- horizon & distant forest ------------------------ */

function Horizon() {
  const tex = useMemo(makeVerticalGradientTexture, []);
  return (
    <group>
      {/* soft mist bands hiding the ground/sky seam */}
      <mesh position={[0, 1.1, -16]}>
        <planeGeometry args={[70, 5]} />
        <meshBasicMaterial map={tex} color="#324459" transparent opacity={0.6} depthWrite={false} fog={false} />
      </mesh>
      <mesh position={[0, 0.4, -11]}>
        <planeGeometry args={[60, 3.2]} />
        <meshBasicMaterial map={tex} color="#2a3a50" transparent opacity={0.45} depthWrite={false} fog={false} />
      </mesh>
      {/* low forested hills, mostly sunk below the horizon */}
      {(
        [
          [9, -2.1, -16, 8, 2.3],
          [14, -2.2, -16, 7, 2.0],
          [-11, -2.3, -16, 9, 2.1],
          [-16, -2.1, -16, 7, 1.8],
        ] as const
      ).map(([x, y, z, w, h], i) => (
        <mesh key={i} position={[x, y, z]} scale={[w, h, 1.5]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color="#0f1930" />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------------------------- embers --------------------------------- */

type EmberState = {
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
  scale: number;
};

function spawnEmber(e: EmberState, initial: boolean) {
  e.x = 0.2 + Math.random() * 4.5 - 1.2;
  e.y = initial ? -1.1 + Math.random() * 2 : -1.1;
  e.z = -1.5 + Math.random() * 5;
  e.speed = 0.1 + Math.random() * 0.22;
  e.phase = Math.random() * Math.PI * 2;
  e.scale = 0.35 + Math.random() * 0.65;
}

/** Tiny glowing motes rising off the ember-lit grass, flickering as they climb. */
function Embers() {
  const mobile = useMemo(isMobile, []);
  const count = mobile ? 22 : 42;
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => new THREE.PlaneGeometry(0.045, 0.045), []);

  const embers = useMemo(() => {
    const arr: EmberState[] = [];
    for (let i = 0; i < count; i++) {
      const e = {} as EmberState;
      spawnEmber(e, true);
      arr.push(e);
    }
    return arr;
  }, [count]);

  const colors = useMemo(() => {
    const c = new THREE.Color();
    return embers.map(() =>
      c.set("#ff9a55").lerp(new THREE.Color("#e8622c"), Math.random()).clone()
    );
  }, [embers]);

  useFrame((state, dt) => {
    if (!pointer.heroVisible) return;
    const d = Math.min(dt, 0.05) * pointer.motion;
    const t = state.clock.elapsedTime;
    const m = mesh.current;
    for (let i = 0; i < embers.length; i++) {
      const e = embers[i];
      e.y += e.speed * d;
      e.x += Math.sin(t * 0.9 + e.phase) * 0.12 * d;
      if (e.y > 0.8 + Math.sin(e.phase) * 0.5) spawnEmber(e, false);

      const flicker = 0.55 + 0.45 * Math.sin(t * 2.6 + e.phase * 3);
      const rise = THREE.MathUtils.clamp((e.y + 1.1) / 0.4, 0, 1); // fade in near ground
      const peak = 0.8 + Math.sin(e.phase) * 0.5;
      const fade = THREE.MathUtils.clamp((peak - e.y) / 0.35, 0, 1); // die out, don't pop
      dummy.position.set(e.x, e.y, e.z);
      dummy.rotation.set(0, 0, e.phase + t * 0.4);
      dummy.scale.setScalar(e.scale * flicker * rise * fade + 0.0001);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={(m) => {
        mesh.current = m as THREE.InstancedMesh;
        if (!m || m.userData.done) return;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        colors.forEach((c, i) => m.setColorAt(i, c));
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
        m.userData.done = true;
      }}
      args={[geometry, undefined, count]}
      frustumCulled={false}
    >
      <meshBasicMaterial
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/* ----------------------------------- mist ---------------------------------- */

const MIST_LAYERS = [
  { w: 11, h: 2.6, y: -0.5, z: -6, o: 0.15, speed: 0.10 },
  { w: 14, h: 3.4, y: -0.1, z: -9, o: 0.11, speed: 0.06 },
  { w: 8, h: 2.0, y: -0.7, z: -1.5, o: 0.10, speed: 0.14 },
  { w: 16, h: 3.8, y: 0.3, z: -12, o: 0.08, speed: 0.04 },
];

function Mist() {
  const tex = useMemo(makeRadialTexture, []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const offsets = useMemo(() => MIST_LAYERS.map(() => Math.random() * 32), []);

  useFrame((state) => {
    if (!pointer.heroVisible) return;
    const t = state.clock.elapsedTime * pointer.motion;
    const cloud = cloudCover(state.clock.elapsedTime);
    MIST_LAYERS.forEach((l, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;
      const range = 34;
      mesh.position.x = ((offsets[i] + t * l.speed) % range) - range / 2;
      mesh.position.y = l.y + Math.sin(t * 0.2 + i * 2) * 0.08;
      // icy air under a passing cloud — the mist thickens slightly
      (mesh.material as THREE.MeshBasicMaterial).opacity = l.o + 0.035 * cloud;
    });
  });

  return (
    <>
      {MIST_LAYERS.map((l, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          position={[0, l.y, l.z]}
        >
          <planeGeometry args={[l.w, l.h]} />
          <meshBasicMaterial
            map={tex}
            color="#8fa2b8"
            transparent
            opacity={l.o}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      ))}
    </>
  );
}

/* --------------------------------- samurai --------------------------------- */

/** A capsule limb stretched between two joints — the building block of the figure. */
function Limb({
  from,
  to,
  r,
  material,
}: {
  from: [number, number, number];
  to: [number, number, number];
  r: number;
  material: THREE.Material;
}) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    return { pos: a.clone().add(b).multiplyScalar(0.5), quat, len: dir.length() };
  }, [from, to]);
  return (
    <mesh position={pos} quaternion={quat} material={material}>
      <capsuleGeometry args={[r, len, 4, 10]} />
    </mesh>
  );
}

/**
 * Procedural samurai — a slim wanderer in strict profile, after the classic ink
 * paintings: a wide kasa worn low over a hidden head, one narrow robe flowing
 * unbroken to the ankles (arms folded within), and the katana worn level
 * through the obi — hilt tilted up in front, saya trailing behind.
 */
function ProceduralSamurai() {
  const group = useRef<THREE.Group>(null!);
  const kasa = useRef<THREE.Group>(null!);
  const ink = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#0a0f16" }),
    []
  );

  const robeGeometry = useMemo(() => {
    // one slim, unbroken fall of cloth: ankle hem → gentle waist → sloped shoulders
    const pts = [
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(0.16, 0),
      new THREE.Vector2(0.155, 0.06),
      new THREE.Vector2(0.125, 0.42),
      new THREE.Vector2(0.105, 0.82),
      new THREE.Vector2(0.096, 1.06),
      new THREE.Vector2(0.102, 1.26),
      new THREE.Vector2(0.096, 1.38),
      new THREE.Vector2(0.05, 1.46),
      new THREE.Vector2(0.001, 1.48),
    ];
    return new THREE.LatheGeometry(pts, 24);
  }, []);

  useFrame((state) => {
    if (!pointer.heroVisible) return;
    const t = state.clock.elapsedTime;
    const m = pointer.motion;
    // he bows only when the traveling wind actually reaches him (x = 1.7)
    const gust = gustAtX(1.7);
    group.current.scale.y = 1 + Math.sin(t * 0.85) * 0.004 * m;
    // the kasa dips and lifts almost imperceptibly, as if scanning the field —
    // and bows briefly into the wind when the visitor's gust arrives
    kasa.current.rotation.x = 0.04 + Math.sin(t * 0.24) * 0.01 * m - gust * 0.05;
    group.current.rotation.z = -gust * 0.012;
  });

  // he faces screen-left (local -z → -x): a clean profile like the reference
  return (
    <group ref={group} position={[1.7, -1.2, 0.6]} rotation-y={1.42}>
      <mesh geometry={robeGeometry} material={ink} />
      {/* head tucked beneath the low-worn kasa */}
      <mesh position={[0, 1.5, 0]} material={ink}>
        <sphereGeometry args={[0.075, 12, 10]} />
      </mesh>
      <group ref={kasa} position={[0, 1.58, 0]}>
        <mesh material={ink}>
          <coneGeometry args={[0.34, 0.15, 24]} />
        </mesh>
      </group>
      {/* katana through the obi — hilt rising in front, saya trailing behind */}
      <Limb from={[0, 1.03, -0.33]} to={[0, 0.95, -0.05]} r={0.017} material={ink} />
      <mesh position={[0, 0.95, -0.05]} scale={[1, 1, 0.5]} rotation-x={Math.PI / 2} material={ink}>
        <sphereGeometry args={[0.036, 10, 8]} />
      </mesh>
      <Limb from={[0, 0.95, -0.05]} to={[0, 0.85, 0.45]} r={0.016} material={ink} />
    </group>
  );
}

/* --------------------------- drop-in model support ------------------------- */

const MODEL_URL = "/models/samurai.glb";

/** A corrupt or incompatible GLB must never take down the scene. */
class ModelBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Renders public/models/samurai.glb as the scene's figure. Any model works:
 * it is forced to ink silhouette, normalized to ~1.7 units tall, grounded at
 * its feet, and its idle animation (if it ships one) plays slow and calm.
 */
// bbox-normalized height for the drop-in model; weapons/props inflate the
// bbox, so this sits below the true figure height — tuned by screenshot
// the cleaned GLB's bbox ≈ true figure height, so this is his real-world size
const MODEL_HEIGHT = 1.6;

function ModelSamurai() {
  const group = useRef<THREE.Group>(null!);
  const { scene: model, animations } = useGLTF(MODEL_URL);
  const { actions, names } = useAnimations(animations, group);
  const ink = useMemo(() => new THREE.MeshBasicMaterial({ color: "#0a0f16" }), []);

  useMemo(() => {
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = ink;
    });
    // measure the RAW model exactly once (useGLTF caches the scene, and dev
    // StrictMode double-runs this memo — the fit must be idempotent)
    if (!model.userData.raw) {
      model.scale.setScalar(1);
      model.position.set(0, 0, 0);
      const box = new THREE.Box3().setFromObject(model);
      model.userData.raw = {
        height: box.getSize(new THREE.Vector3()).y || 1,
        center: box.getCenter(new THREE.Vector3()),
        minY: box.min.y,
      };
    }
    const raw = model.userData.raw as {
      height: number;
      center: THREE.Vector3;
      minY: number;
    };
    const s = MODEL_HEIGHT / raw.height;
    model.scale.setScalar(s);
    model.position.set(-raw.center.x * s, -raw.minY * s, -raw.center.z * s);
  }, [model, ink]);

  useFrame((state) => {
    if (!pointer.heroVisible) return;
    const t = state.clock.elapsedTime;
    const m = pointer.motion;
    // the same quiet life as the rest of the field: breath, and a lean
    // when the traveling gust reaches him (x = 1.7)
    const gust = gustAtX(1.7);
    group.current.scale.y = 1 + Math.sin(t * 0.85) * 0.004 * m;
    group.current.rotation.z = -gust * 0.012;
  });

  useEffect(() => {
    const idle = names.find((n) => /idle/i.test(n)) ?? names[0];
    const action = idle ? actions[idle] : null;
    if (action) {
      action.reset().play();
      action.timeScale = 0.6 * pointer.motion;
    }
  }, [actions, names]);

  // most character models face +z; this turns them toward the horizon,
  // matching the procedural figure's profile — tune per model if needed
  return (
    <group ref={group} position={[1.7, -1.2, 0.6]} rotation-y={Math.PI + 1.42}>
      <primitive object={model} />
    </group>
  );
}

/** Prefers the drop-in GLB when it exists; the procedural figure otherwise. */
function Samurai() {
  const [hasModel, setHasModel] = useState(false);

  useEffect(() => {
    fetch(MODEL_URL, { method: "HEAD" })
      .then((r) => setHasModel(r.ok))
      .catch(() => setHasModel(false));
  }, []);

  if (!hasModel) return <ProceduralSamurai />;
  return (
    <ModelBoundary fallback={<ProceduralSamurai />}>
      <Suspense fallback={<ProceduralSamurai />}>
        <ModelSamurai />
      </Suspense>
    </ModelBoundary>
  );
}

/* ------------------------------- camera rig -------------------------------- */

function Rig() {
  const { camera, size } = useThree();
  useFrame((state, dt) => {
    const d = 1 - Math.exp(-3 * Math.min(dt, 0.05));
    const m = pointer.motion;
    const t = state.clock.elapsedTime;
    // portrait screens: pull back and pan right so the samurai stays in frame
    const narrow = size.width / size.height < 0.9;
    const baseX = narrow ? 1.0 : 0;
    const baseZ = narrow ? 9.6 : 8;
    // scrolling away lifts the gaze toward the sky — a slow cinematic tilt
    const scroll = THREE.MathUtils.clamp(window.scrollY / window.innerHeight, 0, 1);
    const drift = Math.sin(t * 0.1) * 0.06 * m; // near-imperceptible breathing
    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      baseX + pointer.x * 0.4 * m + drift,
      d
    );
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      0.9 - pointer.y * 0.16 * m + scroll * 1.1,
      d
    );
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, baseZ, d);
    camera.lookAt(narrow ? 1.2 : 0.3, 0.55 + scroll * 0.9, -2);
  });
  return null;
}

/* ---------------------------------- scene ---------------------------------- */

export default function AutumnScene() {
  return (
    <>
      <PerspectiveCamera makeDefault fov={42} position={[0, 0.9, 8]} />
      <color attach="background" args={["#0b1322"]} />
      <fogExp2 attach="fog" args={["#1e2c44", 0.042]} />
      <Rig />
      <Sky />
      <Ground />
      <Horizon />
      <Grass />
      <MapleTree />
      <FallingLeaves />
      <Embers />
      <Mist />
      <Samurai />
    </>
  );
}
