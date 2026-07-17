// Shared mutable pointer/wind state — read inside useFrame without re-renders.
export const pointer = {
  x: 0, // normalized -1..1
  y: 0,
  gustAt: -10000, // ms timestamp of last gust (hero click)
  meteorAt: -10000, // ms timestamp of a summoned shooting star (easter egg)
  cloudAt: -1e6, // ms timestamp of a summoned cloud (the m-o-o-n easter egg)
  cloudForce: false, // ?cloud=1 preview flag
  glintForce: false, // ?glint=1 preview flag — katana glint placement tuning
  birdsForce: false, // ?birds=1 preview flag — force the distant flock
  motion: 1, // scaled down when prefers-reduced-motion
  heroVisible: true, // hero View on screen — gates the main scene's CPU work
  footerVisible: false, // footer field View on screen — gates its CPU work
  // still-cursor tracking (the leaf that finds a still cursor):
  stillSince: Infinity, // ms timestamp when the cursor last came to rest
  stillEligible: false, // true only for a fine pointer resting over open field
};

/** How fast the gust front travels across the field, world units / second. */
const GUST_SPEED = 3.5;

/**
 * Gusts OVERLAP: each click adds its own traveling pulse instead of
 * replacing the last one. With a single timestamp, clicking mid-gust reset
 * the envelope through zero — the wind died for a beat and rapid clicks
 * felt ignored. Now drumming on the field builds wind (capped, so the calm
 * survives an excited visitor).
 */
type GustPulse = { at: number; x: number };
const gustPulses: GustPulse[] = [];
// a pulse is spent everywhere once its envelope (4500ms) has passed even the
// farthest corner of the field (~18.5 world units of travel lag)
const GUST_EXPIRED_MS = 4500 + (18.5 / GUST_SPEED) * 1000;
const GUST_KNEE = 1.0; // a single pulse peaks at exactly 1 — passes untouched
const GUST_CAP = 1.35;

/** One pulse: ramps in over ~320ms (wind has an attack — starting at full
 *  strength reads as a snap), peaks, then decays away. */
function pulseAt(age: number) {
  if (age <= 0 || age > 4500) return 0;
  const t = age / 320;
  return t * Math.exp(1 - t);
}

/** Soft knee: identity for a lone gust, smooth compression when gusts stack —
 *  a hard clamp flattened the traveling fronts into visible lockstep. */
function softCap(s: number) {
  if (s <= GUST_KNEE) return s;
  const range = GUST_CAP - GUST_KNEE;
  return GUST_KNEE + range * (1 - Math.exp(-(s - GUST_KNEE) / range));
}

/**
 * Gust strength at a world-x position: each pulse radiates outward from
 * where its click landed, so near leaves surge first and the ronin only
 * bows when that wind actually reaches him.
 */
export function gustAtX(x: number) {
  const now = performance.now();
  let s = 0;
  for (const g of gustPulses) {
    s += pulseAt(now - g.at - (Math.abs(x - g.x) / GUST_SPEED) * 1000);
  }
  return softCap(s);
}

/** True while any gust could still be traveling — cheap gate. */
export function gustLive() {
  const now = performance.now();
  return gustPulses.some((g) => now - g.at < GUST_EXPIRED_MS);
}

/** ndcX: click position in -1..1 screen space → world-x origin of the wind. */
export function gustNow(ndcX = 0) {
  const now = performance.now();
  // drop only pulses that are spent EVERYWHERE — evicting a live pulse would
  // behead its traveling front and snap the far-field wind to zero, the very
  // artifact overlapping gusts exist to prevent. The count limit is only an
  // autoclicker backstop, far above human drumming rates.
  for (let i = gustPulses.length - 1; i >= 0; i--) {
    if (now - gustPulses[i].at > GUST_EXPIRED_MS) gustPulses.splice(i, 1);
  }
  gustPulses.push({ at: now, x: ndcX * 5.5 }); // ≈ field half-width at hero depth
  if (gustPulses.length > 24) gustPulses.shift();
  // last-gust timestamp for consumers that only care that wind happened
  // (the still-cursor leaf's release)
  pointer.gustAt = now;
}

/** Summon a shooting star (the z-e-n easter egg). */
export function meteorNow() {
  pointer.meteorAt = performance.now();
}

/** Summon the cloud across the moon (the m-o-o-n easter egg). One cloud at
 *  a time: re-summoning mid-pass would reset the veil through zero. */
export function cloudNow() {
  const now = performance.now();
  if (now - pointer.cloudAt < 14000) return;
  pointer.cloudAt = now;
}

function hash1(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * 0..1 cloud-over-the-moon: a deterministic schedule in scene time (so the
 * sky shader and the JS-side responders — moon pool, mist, embers — agree),
 * plus the summoned pulse for those who type its name. Roughly every two
 * minutes, sometimes skipped, ~16s raised-sine events.
 */
export function cloudCover(t: number) {
  if (pointer.cloudForce) return 0.85;
  let cover = 0;
  const P = 120;
  const cycle = Math.floor(t / P);
  if (hash1(cycle) >= 0.35) {
    // some cycles stay clear
    const start = 24 + hash1(cycle + 0.5) * (P - 64);
    const p = (t - cycle * P - start) / 16;
    if (p > 0 && p < 1) cover = Math.sin(p * Math.PI) ** 2;
  }
  const sp = (performance.now() - pointer.cloudAt) / 14000;
  if (sp > 0 && sp < 1) cover += Math.sin(sp * Math.PI) ** 2;
  // natural events alone still reach a fully swallowed moon (1.0, as the
  // shader was tuned for) — the cap only tames scheduled+summoned overlap
  return Math.min(cover, 1);
}
