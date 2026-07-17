"use client";

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, View, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { useGlReady } from "./CanvasRoot";
import { pointer } from "./pointer";
import {
  MODEL_URL,
  isDeepNight,
  leafColor,
  lunarPhase,
  makeLeafGeometry,
  makeRadialTexture,
  makeVerticalGradientTexture,
} from "./AutumnScene";

/* The send-off: a slim reprise of the field above the footer — the moon low
   on the horizon (tonight's real phase, still), a few drifting leaves, and
   the samurai small and facing away. The world gets an ending. */

class QuietBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* ------------------------------- mini moon --------------------------------- */

const moonFragment = /* glsl */ `
  uniform float uPhase;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    vec2 nd = (vUv - 0.5) * 2.0;
    float r = length(nd);
    float disc = 1.0 - smoothstep(0.9, 1.0, r);
    float nz = sqrt(max(0.0, 1.0 - dot(nd, nd)));
    float theta = uPhase * 6.2831853;
    vec3 sunDir = normalize(vec3(sin(theta), 0.18, -cos(theta)));
    float lit = smoothstep(-0.04, 0.1, dot(vec3(nd, nz), sunDir));
    float shade = mix(0.38, 1.0, lit);
    vec3 col = vec3(0.84, 0.89, 0.97);
    // the same maria the hero moon wears
    float maria = noise(nd * 3.4 + 3.7) + 0.55 * noise(nd * 7.5 + 9.2);
    col -= vec3(0.24, 0.22, 0.17) * smoothstep(0.42, 0.95, maria);
    col *= shade;
    gl_FragColor = vec4(col, disc * 0.92);
  }
`;

const moonVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function MiniMoon() {
  const glowTex = useMemo(makeRadialTexture, []);
  const uniforms = useMemo(() => ({ uPhase: { value: lunarPhase() } }), []);
  const y = isDeepNight() ? 1.15 : 1.5;
  // the send-off halo carries tonight's illumination too
  const illum = useMemo(() => 0.5 - 0.5 * Math.cos(lunarPhase() * Math.PI * 2), []);
  return (
    <group position={[-3.2, y, -14]}>
      <sprite scale={4.4}>
        <spriteMaterial
          map={glowTex}
          color="#41547e"
          transparent
          opacity={0.28 + 0.24 * illum}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <mesh>
        <planeGeometry args={[1.5, 1.5]} />
        <shaderMaterial
          vertexShader={moonVertex}
          fragmentShader={moonFragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ----------------------------- drifting leaves ------------------------------ */

type FooterLeaf = {
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
};

function FooterLeaves() {
  const count = 10;
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(makeLeafGeometry, []);

  const leaves = useMemo(() => {
    const arr: FooterLeaf[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: -12 + Math.random() * 24,
        y: -1.2 + Math.random() * 3.4,
        z: -4 + Math.random() * 5,
        speed: 0.22 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
        scale: 0.75 + Math.random() * 0.5,
      });
    }
    return arr;
  }, []);

  const colors = useMemo(() => {
    const c = new THREE.Color();
    return leaves.map(() => leafColor(0.35 + Math.random() * 0.65, c).clone());
  }, [leaves]);

  useFrame((state, dt) => {
    if (!pointer.footerVisible) return;
    const d = Math.min(dt, 0.05) * pointer.motion;
    const t = state.clock.elapsedTime;
    const m = mesh.current;
    for (let i = 0; i < leaves.length; i++) {
      const l = leaves[i];
      l.y -= l.speed * d;
      l.x += 0.3 * d + Math.sin(t * 1.1 + l.phase) * 0.3 * d;
      l.rx += 0.6 * d;
      l.rz += 0.4 * d;
      if (l.y < -1.4 || l.x > 14) {
        l.x = -12 + Math.random() * 20;
        l.y = 2.2 + Math.random() * 1.4;
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

/* ------------------------------ farewell figure ----------------------------- */

const FIGURE_HEIGHT = 1.05;

function FarewellSamurai() {
  const group = useRef<THREE.Group>(null!);
  const { scene: cached } = useGLTF(MODEL_URL);
  const ink = useMemo(() => new THREE.MeshBasicMaterial({ color: "#0a0f16" }), []);
  const bowAt = useRef(-1);

  // the hero's <primitive> owns the cached scene — the footer needs its own
  // copy (an Object3D can live in only one scene graph at a time)
  const model = useMemo(() => {
    const clone = SkeletonUtils.clone(cached);
    clone.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = ink;
    });
    clone.scale.setScalar(1);
    clone.position.set(0, 0, 0);
    const box = new THREE.Box3().setFromObject(clone);
    const height = box.getSize(new THREE.Vector3()).y || 1;
    const center = box.getCenter(new THREE.Vector3());
    const s = FIGURE_HEIGHT / height;
    clone.scale.setScalar(s);
    clone.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    return clone;
  }, [cached, ink]);

  useFrame((state) => {
    if (!pointer.footerVisible) {
      // leaving resets nothing — the bow happens once per page, like a farewell
      return;
    }
    const t = state.clock.elapsedTime;
    // the same quiet breath as the hero figure
    group.current.scale.y = 1 + Math.sin(t * 0.85) * 0.004 * pointer.motion;
    // one farewell bow the first time the footer field is seen
    if (bowAt.current < 0) bowAt.current = t + 0.6;
    const p = (t - bowAt.current) / 1.1;
    const bow = p > 0 && p < 5 ? p * Math.exp(1 - p) * Math.max(0, 1 - Math.max(0, p - 4)) : 0;
    group.current.rotation.x = bow * 0.055;
  });

  // facing away, a hint of profile — placed deep so his silhouette stands
  // against the bright mist band rather than dissolving into dark ground
  return (
    <group ref={group} position={[2.6, -1.25, -6.5]} rotation-y={Math.PI - 0.35}>
      <primitive object={model} />
    </group>
  );
}

/* --------------------------------- the field -------------------------------- */

function FooterScene() {
  const mistTex = useMemo(makeVerticalGradientTexture, []);
  const glowTex = useMemo(makeRadialTexture, []);
  const [hasModel, setHasModel] = useState(false);

  useEffect(() => {
    fetch(MODEL_URL, { method: "HEAD" })
      .then((r) => setHasModel(r.ok))
      .catch(() => setHasModel(false));
  }, []);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={26}
        position={[0, 0.55, 9]}
        onUpdate={(c) => c.lookAt(0, 0.4, -6)}
      />
      <color attach="background" args={["#070c14"]} />
      <fogExp2 attach="fog" args={["#101a2c", 0.045]} />
      <MiniMoon />
      {/* far hills closing the horizon — the strip is very wide (page-width
          by ~190px), so the range must run past ±40 world units */}
      {(
        [
          ["#0f1930", -36, -2.3, -15, 10, 2.1],
          ["#0f1930", -22, -2.2, -15, 9, 2.4],
          ["#0f1930", -8, -2.25, -15, 9, 2.2],
          ["#0f1930", 6, -2.4, -15, 8, 1.9],
          ["#0f1930", 16, -2.15, -15, 8, 2.3],
          ["#0f1930", 28, -2.3, -15, 9, 2.2],
          ["#0f1930", 38, -2.2, -15, 8, 2.0],
          ["#15223c", 0, -2.1, -17, 12, 2.5],
          ["#15223c", -15, -2.2, -17, 10, 2.6],
          ["#15223c", -30, -2.15, -17, 10, 2.4],
          ["#15223c", 15, -2.25, -17, 10, 2.3],
          ["#15223c", 32, -2.1, -17, 10, 2.6],
        ] as const
      ).map(([color, x, y, z, w, h], i) => (
        <mesh key={i} position={[x, y, z]} scale={[w, h, 1.5]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
      {/* the ground, and the moon's pool upon it */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -1.25, -4]}>
        <planeGeometry args={[110, 36]} />
        <meshBasicMaterial color="#0a1019" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-2.6, -1.24, -7]}>
        <planeGeometry args={[10, 6]} />
        <meshBasicMaterial
          map={glowTex}
          color="#3a4d6e"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* one low mist band — wide enough to run off both edges of the strip,
          and bright enough for the figure to silhouette against */}
      <mesh position={[0, -0.55, -8]}>
        <planeGeometry args={[100, 2.6]} />
        <meshBasicMaterial
          map={mistTex}
          color="#36485f"
          transparent
          opacity={0.5}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <FooterLeaves />
      {hasModel && (
        <QuietBoundary>
          <Suspense fallback={null}>
            <FarewellSamurai />
          </Suspense>
        </QuietBoundary>
      )}
    </>
  );
}

/** Slim full-bleed strip of the field, rendered above the footer. */
export default function FooterField() {
  const ready = useGlReady();
  const wrapper = useRef<HTMLDivElement>(null);
  // the strip lives four viewports down — don't clone the GLB and build its
  // geometry at initial page load; mount the scene on first approach
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    // two bands: mount well ahead of arrival (GLB clone + geometry get a
    // head start), but run frames — and the one-shot bow — only when the
    // strip is genuinely close to view
    const mountIo = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          mountIo.disconnect();
        }
      },
      { rootMargin: "70% 0px" }
    );
    const visibleIo = new IntersectionObserver(
      ([entry]) => {
        pointer.footerVisible = entry.isIntersecting;
      },
      { rootMargin: "10% 0px" }
    );
    mountIo.observe(el);
    visibleIo.observe(el);
    return () => {
      mountIo.disconnect();
      visibleIo.disconnect();
      pointer.footerVisible = false;
    };
  }, []);

  return (
    <div ref={wrapper} aria-hidden className="relative h-48 w-full overflow-hidden">
      {ready && seen && (
        <View className="absolute inset-0">
          <FooterScene />
        </View>
      )}
      {/* breathe out of the page ink above, and into the footer rule below */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ink-950 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-ink-950 to-transparent" />
    </div>
  );
}
