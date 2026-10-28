import { describe, it, expect } from 'vitest';
import { createTrack } from '../src/track/trackPath.js';
import { createLayout, BOUNDS, WATER_Z, PARK_Z } from '../src/util/layout.js';

const track = createTrack();
const layout = createLayout(track);

describe('layout', () => {
  it('classifies zones from far ocean to near park', () => {
    expect(WATER_Z).toBe(-60);
    expect(PARK_Z).toBe(10);
    expect(layout.zone(0, -80)).toBe('water');
    expect(layout.zone(0, 0)).toBe('sand');
    expect(layout.zone(0, 50)).toBe('park');
  });
  it('reserves free spots and rejects overlaps', () => {
    const l = createLayout(track);
    expect(l.reserve(0, 150, 2)).toBe(true);
    expect(l.reserve(1, 150, 2)).toBe(false);
    expect(l.reserve(10, 150, 2)).toBe(true);
  });
  it('keeps things off the track', () => {
    const p = track.pointAt(0.1);
    expect(createLayout(track).reserve(p.x, p.z, 0.5)).toBe(false);
  });
  it('rejects spots outside the world', () => {
    expect(createLayout(track).reserve(BOUNDS + 5, 0, 1)).toBe(false);
  });
});
