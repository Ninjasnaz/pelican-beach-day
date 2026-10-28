import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createTrack } from '../src/track/trackPath.js';
import { advance, RIDER_SPEED } from '../src/pelican/rider.js';

const track = createTrack();

describe('rider motion', () => {
  it('rides at 5 m/s along the track', () => {
    expect(RIDER_SPEED).toBe(5);
    const u = advance(0.2, 0.05, track.length);
    expect((u - 0.2) * track.length).toBeCloseTo(0.25, 6);
  });
  it('clamps a huge dt so a returning tab does not teleport', () => {
    const u = advance(0.2, 10, track.length);
    expect((u - 0.2) * track.length).toBeLessThanOrEqual(0.1 * 5 + 1e-9);
  });
  it('wraps around the loop', () => {
    const u = advance(0.9999, 0.1, track.length);
    expect(u).toBeGreaterThanOrEqual(0);
    expect(u).toBeLessThan(1);
  });
});

import { nearestU } from '../src/pelican/rider.js';
describe('rider start position', () => {
  it('finds the track point closest to the opening camera', () => {
    const u = nearestU(track, 0, 78);
    const p = track.pointAt(u);
    expect(p.z).toBeGreaterThan(25); // park side, in front of the viewer
    expect(Math.abs(p.x)).toBeLessThan(15);
    for (let i = 0; i < 200; i++) {
      const q = track.pointAt(i / 200);
      expect(Math.hypot(p.x, p.z - 78)).toBeLessThanOrEqual(Math.hypot(q.x, q.z - 78) + 0.05);
    }
  });
});
