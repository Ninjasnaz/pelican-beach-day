import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { solveTwoBone } from '../src/pelican/ik.js';

const hip = new THREE.Vector3(0, 1, 0);
const fwd = new THREE.Vector3(0, 0, 1);

describe('solveTwoBone', () => {
  it('keeps bone lengths and lands the foot on a reachable target', () => {
    const target = new THREE.Vector3(0, 0.3, 0.2);
    const { knee, foot } = solveTwoBone(hip, target, 0.45, 0.45, fwd);
    expect(knee.distanceTo(hip)).toBeCloseTo(0.45, 4);
    expect(knee.distanceTo(foot)).toBeCloseTo(0.45, 4);
    expect(foot.distanceTo(target)).toBeLessThan(1e-4);
  });
  it('bends the knee toward the hint (forward, like a rider)', () => {
    const target = new THREE.Vector3(0, 0.4, 0.1);
    const { knee } = solveTwoBone(hip, target, 0.45, 0.45, fwd);
    const mid = hip.clone().lerp(target, 0.5);
    expect(knee.clone().sub(mid).dot(fwd)).toBeGreaterThan(0);
  });
  it('straightens toward an unreachable target without NaN', () => {
    const target = new THREE.Vector3(0, -2, 0);
    const { knee, foot } = solveTwoBone(hip, target, 0.45, 0.45, fwd);
    expect(Number.isNaN(knee.x + knee.y + knee.z + foot.x + foot.y + foot.z)).toBe(false);
    expect(foot.distanceTo(hip)).toBeCloseTo(0.9, 4);
    expect(foot.y).toBeLessThan(hip.y);
  });
  it('survives a target at the hip', () => {
    const { knee, foot } = solveTwoBone(hip, hip.clone(), 0.45, 0.45, fwd);
    expect(Number.isNaN(knee.x + knee.y + knee.z + foot.x + foot.y + foot.z)).toBe(false);
  });
});
