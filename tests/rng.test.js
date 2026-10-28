import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/util/rng.js';

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(1), b = mulberry32(1);
    const va = Array.from({ length: 5 }, a), vb = Array.from({ length: 5 }, b);
    expect(va).toEqual(vb);
  });
  it('returns values in [0, 1)', () => {
    const r = mulberry32(42);
    for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });
  it('differs between seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});
