import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';

function target() {
  const l = {};
  return { addEventListener: (t, fn) => { (l[t] ||= []).push(fn); }, fire: (t, e = {}) => (l[t] || []).forEach((fn) => fn(e)) };
}

let createCameraManager;
beforeAll(async () => {
  globalThis.window = target();
  ({ createCameraManager } = await import('../src/camera/cameraManager.js'));
});

describe('camera manager follow mode', () => {
  it('re-entering follow eases toward where the pelican is now, not where he was', () => {
    const pos = new THREE.Vector3(0, 1, 0);
    const rider = { getPosition: () => pos, getForward: () => new THREE.Vector3(1, 0, 0) };
    const ctx = { heightAt: () => 0, renderer: { domElement: target() } };
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 10, 30);
    const cams = createCameraManager(ctx, camera, rider, { touch: false });
    cams.setMode('follow');
    for (let i = 0; i < 20; i++) cams.update(0.1);
    cams.setMode('free');
    pos.set(200, 1, 0); // he rode far away meanwhile
    cams.setMode('follow');
    for (let i = 0; i < 8; i++) cams.update(0.1); // full 0.8 s ease
    expect(camera.position.distanceTo(pos)).toBeLessThan(9); // ~7 m follow distance
  });
});

describe('mouse look sensitivity', () => {
  it('a 100 px drag turns the view about 15 degrees', () => {
    const dom = target();
    const rider = { getPosition: () => new THREE.Vector3(), getForward: () => new THREE.Vector3(1, 0, 0) };
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 10, 30);
    const cams = createCameraManager({ heightAt: () => 0, renderer: { domElement: dom } }, camera, rider, { touch: false });
    cams.update(0.016);
    const before = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y;
    dom.fire('pointerdown', { button: 0, clientX: 0, clientY: 0 });
    dom.fire('pointermove', { buttons: 1, clientX: 100, clientY: 0 });
    cams.update(0.016);
    const after = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y;
    expect(THREE.MathUtils.radToDeg(Math.abs(after - before))).toBeCloseTo(15, 0);
  });
});
