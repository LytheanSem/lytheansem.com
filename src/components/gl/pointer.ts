// Shared mutable pointer/wind state — read inside useFrame without re-renders.
export const pointer = {
  x: 0, // normalized -1..1
  y: 0,
  gustAt: -10000, // ms timestamp of last gust (hero click)
  gustX: 0, // world-x origin of the gust — the wind starts where you touch
  meteorAt: -10000, // ms timestamp of a summoned shooting star (easter egg)
  cloudForce: false, // ?cloud=1 preview flag
  motion: 1, // scaled down when prefers-reduced-motion
  heroVisible: true, // hero View on screen — gates the main scene's CPU work
};

/** How fast the gust front travels across the field, world units / second. */
const GUST_SPEED = 3.5;

/**
 * 0..1 strength of the current gust as a smooth pulse: ramps in over ~320ms
 * (wind has an attack — starting at full strength reads as a visual snap),
 * peaks, then decays away. `lagMs` delays the pulse so the gust can travel
 * across the field.
 */
export function gustStrength(lagMs = 0) {
  const age = performance.now() - pointer.gustAt - lagMs;
  if (age <= 0 || age > 4500) return 0;
  const t = age / 320;
  return t * Math.exp(1 - t);
}

/**
 * Gust strength at a world-x position: the pulse radiates outward from where
 * the visitor clicked, so near leaves surge first and the ronin only bows
 * when the wind actually reaches him.
 */
export function gustAtX(x: number) {
  return gustStrength((Math.abs(x - pointer.gustX) / GUST_SPEED) * 1000);
}

/** True while any part of the gust could still be traveling — cheap gate. */
export function gustLive() {
  const age = performance.now() - pointer.gustAt;
  return age >= 0 && age < 8000;
}

/** ndcX: click position in -1..1 screen space → world-x origin of the wind. */
export function gustNow(ndcX = 0) {
  pointer.gustAt = performance.now();
  pointer.gustX = ndcX * 5.5; // ≈ visible field half-width at hero depth
}

/** Summon a shooting star (the z-e-n easter egg). */
export function meteorNow() {
  pointer.meteorAt = performance.now();
}

function hash1(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * 0..1 cloud-over-the-moon schedule, deterministic in scene time so the sky
 * shader (via uniform) and the JS-side responders (moon pool, mist) agree.
 * Roughly every two minutes, sometimes skipped, ~16s raised-sine event.
 */
export function cloudCover(t: number) {
  if (pointer.cloudForce) return 0.85;
  const P = 120;
  const cycle = Math.floor(t / P);
  if (hash1(cycle) < 0.35) return 0; // some cycles stay clear
  const start = 24 + hash1(cycle + 0.5) * (P - 64);
  const p = (t - cycle * P - start) / 16;
  if (p <= 0 || p >= 1) return 0;
  return Math.sin(p * Math.PI) ** 2;
}
