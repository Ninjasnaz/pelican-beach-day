import { describe, it, expect } from 'vitest';
import { mulberry32, SEED } from '../src/util/rng.js';
import { createIdle, idlePose } from '../src/people/idle.js';

const sample = (idle, seconds, step = 0.05) => {
  const out = [];
  for (let t = 0; t <= seconds; t += step) out.push(idlePose(idle, t));
  return out;
};

describe('idle', () => {
  it('is deterministic for the same idle and time', () => {
    for (const kind of ['pacer', 'looker', 'waver', 'sitter']) {
      const idle = createIdle(mulberry32(SEED), kind);
      expect(idlePose(idle, 12.34)).toEqual(idlePose(idle, 12.34));
    }
  });

  it('pacer stays within 1.5 m and pauses for at least a second', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const idle = createIdle(mulberry32(seed), 'pacer');
      const step = 0.05;
      const poses = sample(idle, 60, step);
      expect(Math.max(...poses.map((p) => Math.abs(p.offsetX)))).toBeLessThanOrEqual(1.5);
      let still = 0, longest = 0;
      for (let i = 1; i < poses.length; i++) {
        if (Math.abs(poses[i].offsetX - poses[i - 1].offsetX) < 1e-9) still += step;
        else still = 0;
        longest = Math.max(longest, still);
      }
      expect(longest).toBeGreaterThanOrEqual(1);
      // And it actually moves.
      expect(Math.max(...poses.map((p) => p.offsetX)) - Math.min(...poses.map((p) => p.offsetX))).toBeGreaterThan(0.5);
    }
  });

  it('looker tilts the head up at least 25 degrees, then returns near zero', () => {
    const idle = createIdle(mulberry32(SEED), 'looker');
    const pitches = sample(idle, 60).map((p) => p.headPitch);
    const peak = pitches.indexOf(Math.max(...pitches));
    expect(pitches[peak]).toBeGreaterThanOrEqual(25);
    expect(Math.min(...pitches.slice(peak))).toBeLessThan(2);
  });

  it('waver raises the arm in 0..1 and lowers it again', () => {
    const idle = createIdle(mulberry32(SEED), 'waver');
    const raises = sample(idle, 60).map((p) => p.armRaise);
    expect(Math.max(...raises)).toBeGreaterThan(0.9);
    expect(Math.min(...raises)).toBeGreaterThanOrEqual(0);
    expect(Math.min(...raises)).toBeLessThan(0.05);
  });

  it('gives 20 idles from one rng pairwise distinct phase offsets', () => {
    const rng = mulberry32(SEED);
    const kinds = ['pacer', 'looker', 'waver', 'sitter'];
    const phases = Array.from({ length: 20 }, (_, i) => createIdle(rng, kinds[i % 4]).phase);
    expect(new Set(phases).size).toBe(20);
  });
});
