import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createTrack } from '../src/track/trackPath.js';

const track = createTrack();
const N = 400;
const pts = Array.from({ length: N }, (_, i) => track.pointAt(i / N));

describe('track', () => {
  it('is a closed loop', () => {
    expect(track.pointAt(0).distanceTo(track.pointAt(1))).toBeLessThan(0.01);
  });
  it('is about two city blocks around', () => {
    expect(track.length).toBeGreaterThanOrEqual(380);
    expect(track.length).toBeLessThanOrEqual(480);
  });
  it('has small peaks and valleys', () => {
    const ys = pts.map((p) => p.y);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0.3);
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(2.0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(4.0);
  });
  it('keeps grades rideable (< 12%)', () => {
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[(i + 1) % N];
      const run = Math.hypot(b.x - a.x, b.z - a.z);
      expect(Math.abs(b.y - a.y) / run).toBeLessThan(0.12);
    }
  });
  it('is not a convex oval (curvature changes direction)', () => {
    const turn = [];
    for (let i = 0; i < N; i++) {
      const t0 = track.tangentAt(i / N), t1 = track.tangentAt(((i + 1) % N) / N);
      turn.push(t0.x * t1.z - t0.z * t1.x);
    }
    let changes = 0;
    const signs = turn.filter((v) => Math.abs(v) > 1e-4).map(Math.sign);
    for (let i = 0; i < signs.length; i++) if (signs[i] !== signs[(i + 1) % signs.length]) changes++;
    expect(changes).toBeGreaterThanOrEqual(4);
  });
  it('never turns tighter than an 8 m radius', () => {
    const step = track.length / N;
    for (let i = 0; i < N; i++) {
      const t0 = track.tangentAt(i / N), t1 = track.tangentAt(((i + 1) % N) / N);
      const a0 = Math.atan2(t0.z, t0.x), a1 = Math.atan2(t1.z, t1.x);
      let d = Math.abs(a1 - a0); if (d > Math.PI) d = 2 * Math.PI - d;
      if (d > 1e-6) expect(step / d).toBeGreaterThanOrEqual(8);
    }
  });
  it('reaches both the beach side and the park side', () => {
    expect(pts.some((p) => p.z <= -15)).toBe(true);
    expect(pts.some((p) => p.z >= 30)).toBe(true);
  });
  it('measures horizontal distance to the centerline', () => {
    const p = track.pointAt(0.25);
    expect(track.distanceTo(p.x, p.z)).toBeLessThan(0.6);
    expect(track.distanceTo(p.x, p.z + 0) + 0).toBeLessThan(track.distanceTo(0, 300));
  });
  it('exposes width and a closed CatmullRom curve', () => {
    expect(track.width).toBe(3.2);
    expect(track.curve).toBeInstanceOf(THREE.CatmullRomCurve3);
    expect(track.curve.closed).toBe(true);
  });
});
