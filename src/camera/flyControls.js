import * as THREE from 'three';
import { WATER_LEVEL } from '../world/terrain.js';
import { BOUNDS } from '../util/layout.js';

export const FLY_SPEED = 12; // m/s
export const BOOST = 3;
export const MIN_CLEARANCE = 1.5;
export const CEILING = 150;
export const MAX_PITCH = THREE.MathUtils.degToRad(85);
const MAX_DT = 0.1;

const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const _m = new THREE.Vector3();

// Pure flying step. yaw 0 looks toward -Z; W/S move along the full look
// direction (so looking down and backing up rises away from the ground).
export function stepFly(state, input, dt) {
  dt = Math.min(dt, MAX_DT);
  const { yaw, pitch } = state;
  _f.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  _r.set(Math.cos(yaw), 0, -Math.sin(yaw));
  _m.set(0, 0, 0).addScaledVector(_f, input.forward).addScaledVector(_r, input.right);
  _m.y += input.up;
  if (_m.lengthSq() > 1) _m.normalize();
  const speed = FLY_SPEED * (input.boost ? BOOST : 1);
  return { ...state, pos: state.pos.clone().addScaledVector(_m, speed * dt) };
}

// Never below terrain or water, never outside the world or above the ceiling.
export function clampCamera(pos, heightAt) {
  pos.x = THREE.MathUtils.clamp(pos.x, -BOUNDS, BOUNDS);
  pos.z = THREE.MathUtils.clamp(pos.z, -BOUNDS, BOUNDS);
  const floor = Math.max(heightAt(pos.x, pos.z), WATER_LEVEL) + MIN_CLEARANCE;
  pos.y = THREE.MathUtils.clamp(pos.y, floor, CEILING);
  return pos;
}

const KEYS = {
  KeyW: ['forward', 1], ArrowUp: ['forward', 1],
  KeyS: ['forward', -1], ArrowDown: ['forward', -1],
  KeyD: ['right', 1], ArrowRight: ['right', 1],
  KeyA: ['right', -1], ArrowLeft: ['right', -1],
  KeyE: ['up', 1], KeyQ: ['up', -1],
};

// Keyboard state; all keys release on window blur so nothing drifts.
export function createInputState(target = window) {
  const down = new Set();
  target.addEventListener('keydown', (e) => down.add(e.code));
  target.addEventListener('keyup', (e) => down.delete(e.code));
  target.addEventListener('blur', () => down.clear());
  return {
    read() {
      const out = { forward: 0, right: 0, up: 0, boost: down.has('ShiftLeft') || down.has('ShiftRight') };
      for (const code of down) {
        const k = KEYS[code];
        if (k) out[k[0]] = THREE.MathUtils.clamp(out[k[0]] + k[1], -1, 1);
      }
      return out;
    },
    clear: () => down.clear(),
  };
}
