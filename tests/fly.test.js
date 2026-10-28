import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { stepFly, clampCamera, createInputState, FLY_SPEED } from '../src/camera/flyControls.js';
import { heightAt, WATER_LEVEL } from '../src/world/terrain.js';

const state = (pitchDeg = 0, pos = [0, 20, 0]) => ({ pos: new THREE.Vector3(...pos), yaw: 0, pitch: THREE.MathUtils.degToRad(pitchDeg) });
const input = (o = {}) => ({ forward: 0, right: 0, up: 0, boost: false, ...o });

describe('stepFly', () => {
  it('moves forward along the look direction (yaw 0 looks toward -Z)', () => {
    expect(FLY_SPEED).toBe(12);
    const s = stepFly(state(), input({ forward: 1 }), 0.1);
    expect(s.pos.z).toBeCloseTo(-1.2, 5);
    expect(s.pos.x).toBeCloseTo(0, 5);
  });
  it('pressing S while looking down pulls up and back (zoom out = flying)', () => {
    const s = stepFly(state(-45), input({ forward: -1 }), 0.1);
    expect(s.pos.y).toBeGreaterThan(20);
    expect(s.pos.z).toBeGreaterThan(0);
  });
  it('boost (Shift) triples speed', () => {
    const s = stepFly(state(), input({ forward: 1, boost: true }), 0.1);
    expect(s.pos.z).toBeCloseTo(-3.6, 5);
  });
  it('E rises and Q lowers straight up/down at any pitch', () => {
    const up = stepFly(state(-30), input({ up: 1 }), 0.1);
    expect(up.pos.y).toBeCloseTo(21.2, 5);
    expect(up.pos.x).toBeCloseTo(0, 5);
    expect(up.pos.z).toBeCloseTo(0, 5);
    expect(stepFly(state(), input({ up: -1 }), 0.1).pos.y).toBeCloseTo(18.8, 5);
  });
  it('A/D strafe sideways', () => {
    expect(stepFly(state(), input({ right: 1 }), 0.1).pos.x).toBeCloseTo(1.2, 5);
  });
  it('treats a huge dt as 0.1 s (no teleport after a hidden tab)', () => {
    const s = stepFly(state(), input({ forward: 1 }), 5);
    expect(s.pos.z).toBeCloseTo(-1.2, 5);
  });
});

describe('clampCamera', () => {
  it('keeps the camera above sand', () => {
    const p = clampCamera(new THREE.Vector3(0, 0.2, 0), heightAt);
    expect(p.y).toBeCloseTo(heightAt(0, 0) + 1.5, 5);
  });
  it('keeps the camera above water', () => {
    const p = clampCamera(new THREE.Vector3(0, -3, -120), heightAt);
    expect(p.y).toBeCloseTo(WATER_LEVEL + 1.5, 5);
  });
  it('keeps the camera inside the world and under the ceiling', () => {
    const p = clampCamera(new THREE.Vector3(400, 500, -400), heightAt);
    expect(p.x).toBe(250);
    expect(p.z).toBe(-250);
    expect(p.y).toBe(150);
  });
});

describe('createInputState', () => {
  const target = () => {
    const l = {};
    return { addEventListener: (t, fn) => { (l[t] ||= []).push(fn); }, fire: (t, e = {}) => (l[t] || []).forEach((fn) => fn(e)) };
  };
  it('maps WASD/QE/Shift to input axes', () => {
    const t = target();
    const inp = createInputState(t);
    t.fire('keydown', { code: 'KeyW' });
    t.fire('keydown', { code: 'KeyD' });
    t.fire('keydown', { code: 'KeyE' });
    t.fire('keydown', { code: 'ShiftLeft' });
    expect(inp.read()).toEqual({ forward: 1, right: 1, up: 1, boost: true });
    t.fire('keyup', { code: 'KeyW' });
    expect(inp.read().forward).toBe(0);
  });
  it('releases all keys when the window loses focus', () => {
    const t = target();
    const inp = createInputState(t);
    t.fire('keydown', { code: 'KeyW' });
    t.fire('blur');
    expect(inp.read().forward).toBe(0);
  });
});
