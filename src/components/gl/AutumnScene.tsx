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
import { pointer, gustAtX, gustLive, cloudCover } from "./pointer";

/* ---------------------------------- utils --------------------------------- */

const leafStops = ["#6f2013", "#a53318", "#c2431f", "#e8622c", "#ef7a37", "#ff9c52"].map(
  (c) => new THREE.Color(c)
);

export function leafColor(t: number, out: THREE.Color) {
  const f = THREE.MathUtils.clamp(t, 0, 0.999) * (leafStops.length - 1);
  const i = Math.floor(f);
  return out.copy(leafStops[i]).lerp(leafStops[i + 1], f - i);
}

export function makeRadialTexture() {
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

export function makeVerticalGradientTexture() {
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
export function makeLeafGeometry() {
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
  uniform float uMoonY;      // moon height — rides lower for deep-night visitors
  uniform float uStarDensity; // star threshold — the small hours show more stars
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
    vec2 d = (uv - vec2(0.56, uMoonY)) * vec2(70.0 / 30.0, 1.0);
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
    float isStar = smoothstep(uStarDensity, 1.0, seed);
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
export function lunarPhase() {
  const SYNODIC = 29.530588853;
  const KNOWN_NEW = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const days = Date.now() / 86400000 - KNOWN_NEW;
  return ((days % SYNODIC) + SYNODIC) % SYNODIC / SYNODIC;
}

/** True in the small hours (local 00:00–03:59) — the site quietly knows. */
export const isDeepNight = () => new Date().getHours() < 4;

function Sky() {
  const mat = useRef<THREE.ShaderMaterial>(null!);
  const meteorLatch = useRef(-10000);
  const uniforms = useMemo(() => {
    // visitors browsing in the small hours get a truer small-hours sky:
    // more stars, the moon riding lower — nobody is told, the site just knows
    const deep = isDeepNight();
    return {
      uTime: { value: 0 },
      uPhase: { value: lunarPhase() },
      uCloud: { value: 0 },
      uMeteorStart: { value: -100 },
      uMoonY: { value: deep ? 0.585 : 0.63 },
      uStarDensity: { value: deep ? 0.9935 : 0.9965 },
    };
  }, []);
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
  const emberGlow = useRef<THREE.MeshBasicMaterial>(null!);
  // tonight's illumination, 0 = new moon, 1 = full — set once at mount:
  // full-moon nights spill a wider, brighter pool across the field
  const illum = useMemo(() => 0.5 - 0.5 * Math.cos(lunarPhase() * Math.PI * 2), []);

  useFrame((state) => {
    if (!pointer.heroVisible) return;
    // the field reflection breathes with the halo — and fades under a cloud;
    // when the cloud takes the cold light, the warm embers answer
    const t = state.clock.elapsedTime;
    const cloud = cloudCover(t);
    moonPool.current.opacity =
      (0.13 + 0.16 * illum) * (1 + 0.15 * Math.sin(t * 0.25)) * (1 - 0.6 * cloud);
    emberGlow.current.opacity = 0.26 * (1 + 0.5 * cloud);
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
          ref={emberGlow}
          map={glowTex}
          color="#b5511f"
          transparent
          opacity={0.26}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* faint moonlight pool on the field below the moon */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0.2, -1.195, -6]}
        scale={[1 + illum * 0.45, 1 + illum * 0.25, 1]}
      >
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
      <GrassBand count={Math.floor(n * 0.7)} z={0.5} phase={5.6} />
      <GrassBand count={n} z={1.6} phase={0} />
      <GrassBand count={n} z={2.8} phase={2.1} />
      <GrassBand count={Math.floor(n * 0.85)} z={3.9} phase={4.2} />
      {/* foreground fringe — nearest the camera, framing the field's edge */}
      <GrassBand count={Math.floor(n * 0.55)} z={4.9} phase={1.3} />
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

/**
 * A far-off maple silhouette — same canopy recipe as the hero tree, but
 * smaller, dimmer, and colors sunk toward the night air so it reads as
 * depth, not competition.
 */
function DistantTree({
  position,
  scale = 0.55,
  dim = 0.55,
  swayPhase = 0,
}: {
  position: [number, number, number];
  scale?: number;
  dim?: number;
  swayPhase?: number;
}) {
  const mobile = useMemo(isMobile, []);
  const count = mobile ? 130 : 260;
  const canopy = useRef<THREE.Group>(null!);
  const geometry = useMemo(makeLeafGeometry, []);

  const { matrices, colors } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const night = new THREE.Color("#101b2d");
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
      const s = 1.1 + Math.random() * 1.1; // fewer, larger leaves — reads as mass at distance
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
      leafColor(Math.random(), color);
      color.lerp(night, dim);
      colors.push(color.clone());
    }
    return { matrices, colors };
  }, [count, dim]);

  useFrame((state) => {
    if (!pointer.heroVisible) return;
    // same idle-only sway law as the hero tree — never answers the gust
    canopy.current.rotation.z =
      Math.sin(state.clock.elapsedTime * 0.4 + swayPhase) * 0.01 * pointer.motion;
  });

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.3, 0]} rotation-z={0.12}>
        <cylinderGeometry args={[0.07, 0.2, 2.7, 7]} />
        <meshBasicMaterial color="#070b12" />
      </mesh>
      <mesh position={[0.6, 2.5, 0]} rotation-z={-0.85}>
        <cylinderGeometry args={[0.035, 0.07, 1.6, 6]} />
        <meshBasicMaterial color="#070b12" />
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

/**
 * Fallen leaves resting on the field — the quiet evidence of every night the
 * wind has already had. Static instances, one draw call: concentrated under
 * the maple and thinning downwind across the field.
 */
function LeafLitter() {
  const mobile = useMemo(isMobile, []);
  const count = mobile ? 70 : 150;
  const geometry = useMemo(makeLeafGeometry, []);

  const { matrices, colors } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const ground = new THREE.Color("#0d1422");
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    for (let i = 0; i < count; i++) {
      // drift downwind (+x) from the tree at x=-4.1, thinning with distance
      const spread = -Math.log(1 - Math.random()) * 4.5; // exponential tail
      const x = -5.5 + Math.random() * 3 + spread;
      const z = -5 + Math.random() * 8;
      dummy.position.set(x, -1.19 + Math.random() * 0.008, z);
      // flat on the ground, each at its own angle, a few slightly cocked
      dummy.rotation.set(
        -Math.PI / 2 + (Math.random() - 0.5) * 0.4,
        0,
        Math.random() * Math.PI * 2
      );
      const s = 0.45 + Math.random() * 0.5;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
      // fallen leaves are duller than flying ones — sunk toward the ink
      leafColor(Math.random(), color);
      color.lerp(ground, 0.45 + Math.random() * 0.25);
      colors.push(color.clone());
    }
    return { matrices, colors };
  }, [count]);

  return (
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
  );
}

/**
 * A low shrub — a small flattened clump of the same momiji leaves, no trunk,
 * sitting between the grass and the horizon. Static; the grass around it
 * carries the movement.
 */
function Shrub({
  position,
  r = 0.7,
  dim = 0.45,
}: {
  position: [number, number, number];
  r?: number;
  dim?: number;
}) {
  const mobile = useMemo(isMobile, []);
  const count = mobile ? 34 : 64;
  const geometry = useMemo(makeLeafGeometry, []);

  const { matrices, colors } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const night = new THREE.Color("#101b2d");
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 0.9,
        Math.random() * 2 - 1
      ).normalize();
      const rad = r * Math.cbrt(Math.random());
      dummy.position.set(dir.x * rad, Math.abs(dir.y) * rad * 0.55, dir.z * rad * 0.8);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const s = 0.9 + Math.random() * 0.8;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
      leafColor(Math.random(), color);
      color.lerp(night, dim);
      colors.push(color.clone());
    }
    return { matrices, colors };
  }, [count, r, dim]);

  return (
    <group position={position}>
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

  // the leaf that finds a still cursor: after ~5s of true stillness over the
  // open field, the nearest falling leaf drifts over — never faster than its
  // own fall pace — rests, rocks, and releases at the first sign of movement
  const still = useRef({ idx: -1, gustAt: -1e9, resting: false, restRz: 0 });

  useFrame((state, dt) => {
    if (!pointer.heroVisible) return;
    const d = Math.min(dt, 0.05) * pointer.motion;
    const t = state.clock.elapsedTime;
    const live = gustLive();
    const baseWind = 0.38 + pointer.x * 0.55;

    const s = still.current;
    const now = performance.now();
    const stillFor = now - pointer.stillSince;
    const eligible = pointer.stillEligible && pointer.motion === 1;
    // release: the cursor moved, became ineligible, or the visitor stirred
    // the wind — the leaf returns to the sky's ordinary physics mid-air
    if (s.idx >= 0 && (!eligible || stillFor < 4800 || pointer.gustAt !== s.gustAt)) {
      s.idx = -1;
      s.resting = false;
    }
    // cursor world position, same mapping the gust uses for x
    const tx = THREE.MathUtils.clamp(pointer.x * 5.5, -8, 11);
    const ty = THREE.MathUtils.clamp(-pointer.y * 3.0 + 0.7, -1.0, 3.4);
    // no reacquisition while a gust is live: a click releases the resting
    // leaf into the wind, and without this guard the same frame would
    // recapture it before the gust could ever move it
    if (s.idx < 0 && eligible && stillFor > 5000 && now - pointer.gustAt > 4500) {
      // choose the nearest leaf that is mid-fall and near the field's front
      let best = -1;
      let bestDist = Infinity;
      for (let i = 0; i < leaves.length; i++) {
        const l = leaves[i];
        if (l.y < -1.1 || l.y > 3.6 || l.z < -2.5) continue;
        const dist = Math.hypot(l.x - tx, l.y - ty);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      if (best >= 0) {
        s.idx = best;
        s.gustAt = pointer.gustAt;
        s.resting = false;
      }
    }

    const m = mesh.current;
    for (let i = 0; i < leaves.length; i++) {
      const l = leaves[i];
      if (i === s.idx) {
        // the summoned leaf: drift toward the cursor at its OWN fall speed
        // (a homing dart would read as a speed change — forbidden)
        const dx = tx - l.x;
        const dy = ty - l.y;
        const dist = Math.hypot(dx, dy);
        if (s.resting || dist < 0.15) {
          if (!s.resting) {
            s.resting = true;
            s.restRz = l.rz;
          }
          // at rest on the still cursor: a gentle rock, nothing more
          l.rz = s.restRz + Math.sin(t * 1.4) * 0.15;
        } else {
          const step = Math.min(l.speed * d, dist);
          l.x += (dx / dist) * step;
          l.y += (dy / dist) * step;
          // tumble eases off as it approaches, like a landing
          const calm = THREE.MathUtils.clamp(dist / 1.2, 0.15, 0.5);
          l.rx += l.sx * d * calm;
          l.ry += l.sy * d * calm;
          l.rz += l.sz * d * calm;
        }
      } else {
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
      }

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
      {/* a farther, hazier range behind them — taller peaks fading into the
          night air; kept low across the center so the moon pool stays open */}
      {(
        [
          [-6, -2.0, -18.5, 10, 2.9],
          [-14, -1.9, -18.5, 8, 2.6],
          [3, -2.35, -18.5, 9, 1.9],
          [12, -2.05, -18.5, 9, 2.7],
          [19, -2.2, -18.5, 7, 2.2],
        ] as const
      ).map(([x, y, z, w, h], i) => (
        <mesh key={`far-${i}`} position={[x, y, z]} scale={[w, h, 1.5]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color="#15223c" />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------- distant birds ------------------------------ */

/** Loose V of wild geese trailing the leader — an autumn-moon motif. */
const FLOCK_OFFSETS: [number, number][] = [
  [0, 0],
  [-0.6, -0.22],
  [-1.15, -0.42],
  [-0.55, 0.2],
  [-1.08, 0.38],
];

/**
 * Once in a long while, a far flock crosses the high sky — silhouette-thin,
 * seconds long, gone. Scheduled like the shooting star so the sky stays
 * quiet; skipped entirely under reduced motion. Preview with ?birds=1.
 */
function BirdFlock() {
  const group = useRef<THREE.Group>(null!);
  const birds = useRef<THREE.Mesh[]>([]);

  // a thin chevron — two swept wings meeting at the body
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0.2);
    s.lineTo(0, 0);
    s.lineTo(0.5, 0.2);
    s.lineTo(0.5, 0.13);
    s.lineTo(0, -0.05);
    s.lineTo(-0.5, 0.13);
    s.closePath();
    return new THREE.ShapeGeometry(s, 2);
  }, []);

  useFrame((state) => {
    if (!pointer.heroVisible) return;
    const t = state.clock.elapsedTime;
    const g = group.current;

    // schedule: ~72s cycles, some skipped — a patient visitor sees one or
    // two crossings, never a sky full of traffic; ?birds=1 keeps them coming
    const period = 72;
    const crossTime = 26;
    let p = -1;
    let cycle = 0;
    if (pointer.birdsForce) {
      p = (t % 30) / 30;
      cycle = Math.floor(t / 30);
    } else if (pointer.motion === 1) {
      cycle = Math.floor(t / period);
      // the first crossing is guaranteed, ~7s in — every visitor who lingers
      // meets the flock once; after that, they return to being a rarity
      if (cycle === 0 || sceneHash(cycle + 31.7) > 0.45) {
        const start =
          cycle === 0
            ? 7
            : cycle * period + 4 + sceneHash(cycle + 8.9) * (period - crossTime - 8);
        p = (t - start) / crossTime;
      }
    }
    if (p <= 0 || p >= 1) {
      g.visible = false;
      return;
    }
    g.visible = true;

    // alternate crossings fly the other way; a slow arc with a gentle undulation
    const dir = sceneHash(cycle + 2.4) > 0.5 ? 1 : -1;
    const x = dir * (-24 + p * 48);
    const y = 3.1 + Math.sin(p * Math.PI) * 0.9 + Math.sin(t * 0.45) * 0.12;
    g.position.set(x, y, -15);
    g.scale.x = dir;

    birds.current.forEach((b, i) => {
      if (!b) return;
      // wingbeats: tips rise and fall — a shape change, no path speed change
      b.scale.y = 0.45 + Math.abs(Math.sin(t * 4.6 + i * 1.9)) * 0.75;
      b.position.y = FLOCK_OFFSETS[i][1] + Math.sin(t * 0.9 + i * 2.2) * 0.05;
    });
  });

  return (
    <group ref={group} visible={false}>
      {FLOCK_OFFSETS.map(([ox, oy], i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) birds.current[i] = m;
          }}
          position={[ox, oy, 0]}
          scale={[0.34, 0.34, 0.34]}
          geometry={geometry}
        >
          <meshBasicMaterial color="#0a1019" side={THREE.DoubleSide} fog={false} />
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

export const MODEL_URL = "/models/samurai.glb";

// start fetching the figure the moment this bundle evaluates — by the time
// the HEAD check passes and Suspense mounts, the download is already in
// flight (or done), so the procedural stand-in barely gets a frame.
// Guarded: client components are also evaluated during prerender.
if (typeof window !== "undefined") useGLTF.preload(MODEL_URL);

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
  // starts invisible and materializes on first frame — there is no loading
  // stand-in to swap from, so the figure fades in like mist parting
  const ink = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#0a0f16", transparent: true, opacity: 0 }),
    []
  );
  const born = useRef(-1);

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
    // materialize over ~0.8s the first time he's seen, then go opaque
    // (transparent silhouettes can sort oddly against the leaves)
    if (born.current < 0) born.current = t;
    const k = THREE.MathUtils.clamp((t - born.current) / 0.8, 0, 1);
    if (ink.transparent) {
      ink.opacity = k;
      if (k >= 1) {
        ink.transparent = false;
        ink.needsUpdate = true;
      }
    }
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

function sceneHash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Once in a long while, moonlight catches the katana — one quiet glint on
 * roughly the shooting star's cadence, offset so the two never share a
 * moment. Rewards the visitor who lingers; costs nothing to those who don't.
 * Preview with ?glint=1 (continuous pulse for placement tuning).
 */
function KatanaGlint({ position }: { position: [number, number, number] }) {
  const tex = useMemo(makeRadialTexture, []);
  const mat = useRef<THREE.SpriteMaterial>(null!);
  const sprite = useRef<THREE.Sprite>(null!);

  useFrame((state) => {
    if (!pointer.heroVisible) return;
    const t = state.clock.elapsedTime;
    let s = 0;
    if (pointer.glintForce) {
      s = 0.8 + 0.2 * Math.sin(t * 2); // held on for placement tuning
    } else if (pointer.motion === 1) {
      // ~47s cycles, half skipped — a rarity, not a beacon
      const period = 47;
      const cycle = Math.floor(t / period);
      if (sceneHash(cycle + 17.3) > 0.5) {
        const start = cycle * period + 6 + sceneHash(cycle + 4.2) * (period - 12);
        const p = (t - start) / 1.4;
        if (p > 0 && p < 1) s = Math.sin(p * Math.PI) ** 2;
      }
    }
    // fully hidden ~97% of the time — drop out of the render list entirely
    sprite.current.visible = s > 0;
    if (!sprite.current.visible) return;
    mat.current.opacity = s * 0.85;
    sprite.current.scale.setScalar(0.001 + s * 0.17);
  });

  return (
    <sprite ref={sprite} position={position} scale={0.001}>
      <spriteMaterial
        ref={mat}
        map={tex}
        color="#dbe8ff"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  );
}

/**
 * The GLB ships with the site, so it is assumed: while it loads the field
 * simply waits (no stand-in — a swap between two silhouettes reads as a
 * glitch), and the figure materializes when ready. The procedural wanderer
 * appears only if loading actually fails: file missing or unparseable.
 */
function Samurai() {
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(MODEL_URL, { method: "HEAD" })
      .then((r) => {
        if (!r.ok) setMissing(true);
      })
      .catch(() => setMissing(true));
  }, []);

  // the glint rides each figure's own blade line (tuned via ?glint=1)
  const proceduralFigure = (
    <>
      <ProceduralSamurai />
      <KatanaGlint position={[1.65, -0.26, 0.6]} />
    </>
  );

  if (missing) return proceduralFigure;
  return (
    <ModelBoundary fallback={proceduralFigure}>
      <Suspense fallback={null}>
        <ModelSamurai />
        <KatanaGlint position={[1.95, -0.68, 0.62]} />
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
      {/* far company for the lone maple — depth, not competition */}
      <DistantTree position={[8.6, -1.25, -9]} scale={0.55} dim={0.55} swayPhase={1.7} />
      <DistantTree position={[-9.8, -1.3, -12]} scale={0.45} dim={0.7} swayPhase={3.9} />
      <DistantTree position={[14, -1.3, -13.5]} scale={0.38} dim={0.78} swayPhase={2.8} />
      <BirdFlock />
      {/* the field itself lives: fallen leaves and low shrubs among the grass */}
      <LeafLitter />
      <Shrub position={[-7.6, -1.22, -1.6]} r={0.75} dim={0.5} />
      <Shrub position={[5.8, -1.22, -4.6]} r={0.6} dim={0.6} />
      <Shrub position={[10.5, -1.22, -2.5]} r={0.85} dim={0.55} />
      <Grass />
      <MapleTree />
      <FallingLeaves />
      <Embers />
      <Mist />
      <Samurai />
    </>
  );
}
