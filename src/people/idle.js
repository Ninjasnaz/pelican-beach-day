import { range } from '../util/rng.js';

// Idle loops for crowd members. Nobody roams: each person repeats a small
// four-beat cycle (rest, ease to B, hold B, ease back to A) at their own random
// phase, so no two people move in sync. idlePose is pure: same idle + t, same pose.

export const IDLE_KINDS = ['pacer', 'looker', 'waver', 'sitter'];

const smooth = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

// Where are we in a hold/move/hold/move cycle? s is 0 at A, 1 at B (eased);
// dir is +1 while heading to B, -1 while heading back, 0 while holding.
function beat(idle, t) {
  const { holdA, move, holdB, moveBack, period } = idle;
  const c = ((((t + idle.phase) % period) + period) % period);
  if (c < holdA) return { s: 0, dir: 0 };
  if (c < holdA + move) return { s: smooth((c - holdA) / move), dir: 1 };
  if (c < holdA + move + holdB) return { s: 1, dir: 0 };
  return { s: 1 - smooth((c - holdA - move - holdB) / moveBack), dir: -1 };
}

export function createIdle(rng, kind) {
  const idle = { kind };
  switch (kind) {
    case 'pacer': // a few steps back and forth with real pauses at each end
      idle.holdA = range(rng, 2, 3.5);
      idle.holdB = range(rng, 2, 3.5);
      idle.move = idle.moveBack = range(rng, 2, 3);
      idle.amp = range(rng, 0.6, 1.3);
      break;
    case 'looker': // glance up at the sky, then back to the beach
      idle.holdA = range(rng, 3, 6);
      idle.move = range(rng, 1, 1.6);
      idle.holdB = range(rng, 2, 4);
      idle.moveBack = range(rng, 1.2, 1.8);
      idle.peak = range(rng, 28, 42);
      idle.turn = range(rng, -0.35, 0.35);
      break;
    case 'waver': // arm up for a wave, then down
      idle.holdA = range(rng, 4, 8);
      idle.move = range(rng, 0.4, 0.7);
      idle.holdB = range(rng, 2.5, 4);
      idle.moveBack = range(rng, 0.5, 0.8);
      idle.turn = range(rng, -0.4, 0.4);
      break;
    case 'sitter': // shift position, glance, settle
      idle.holdA = range(rng, 4, 9);
      idle.move = idle.moveBack = range(rng, 1, 1.8);
      idle.holdB = range(rng, 3, 7);
      idle.turn = range(rng, 0.15, 0.4) * (rng() < 0.5 ? -1 : 1);
      idle.shift = range(rng, 0.04, 0.12) * Math.sign(idle.turn);
      idle.glance = range(rng, 6, 14);
      break;
    default:
      throw new Error(`unknown idle kind: ${kind}`);
  }
  idle.period = idle.holdA + idle.move + idle.holdB + idle.moveBack;
  idle.phase = rng() * idle.period;
  return idle;
}

// -> { offsetX (m, along the person's local X), yaw (rad, added to their base
// facing), headPitch (deg, positive = looking up), armRaise (0..1) }
export function idlePose(idle, t) {
  const { s, dir } = beat(idle, t);
  const pose = { offsetX: 0, yaw: 0, headPitch: 0, armRaise: 0 };
  switch (idle.kind) {
    case 'pacer': {
      pose.offsetX = idle.amp * (2 * s - 1);
      // Turn to face the way they are walking, square up to the sea at each end.
      const bell = 4 * s * (1 - s);
      pose.yaw = dir * (Math.PI / 2) * Math.min(1, bell * 3);
      break;
    }
    case 'looker':
      pose.headPitch = idle.peak * s;
      pose.yaw = idle.turn * s;
      break;
    case 'waver':
      pose.armRaise = s;
      pose.headPitch = 6 * s;
      pose.yaw = idle.turn * s;
      break;
    case 'sitter':
      pose.yaw = idle.turn * s;
      pose.offsetX = idle.shift * s;
      pose.headPitch = idle.glance * Math.sin(Math.PI * s);
      break;
  }
  return pose;
}
