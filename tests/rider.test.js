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
