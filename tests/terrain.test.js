import { describe, it, expect } from 'vitest';
import { heightAt, WATER_LEVEL } from '../src/world/terrain.js';
import { createTrack } from '../src/track/trackPath.js';
import { BOUNDS } from '../src/util/layout.js';

describe('terrain', () => {
  it('stays gentle across the world', () => {
    for (let x = -BOUNDS; x <= BOUNDS; x += 10)
      for (let z = -BOUNDS; z <= BOUNDS; z += 10) {
        const h = heightAt(x, z);
        expect(h).toBeGreaterThanOrEqual(-0.5);
        expect(h).toBeLessThanOrEqual(1.2);
      }
  });
  it('slopes below the water far out', () => {
    expect(WATER_LEVEL).toBe(0);
    expect(heightAt(0, -70)).toBeLessThan(WATER_LEVEL);
  });
  it('keeps the park above water', () => {
    expect(heightAt(0, 50)).toBeGreaterThan(0.2);
  });
  it('stays below the boardwalk deck everywhere', () => {
    const track = createTrack();
    for (let i = 0; i < 400; i++) {
      const p = track.pointAt(i / 400);
      expect(heightAt(p.x, p.z)).toBeLessThan(p.y - 0.2);
    }
  });
});
