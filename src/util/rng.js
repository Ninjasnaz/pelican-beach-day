// Seeded PRNG so the scene is identical on every load.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SEED = 20261028;

// Small helpers used across modules.
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
export const range = (rng, min, max) => min + rng() * (max - min);
