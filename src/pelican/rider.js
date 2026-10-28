import * as THREE from 'three';
import { createBike, pedalPositions, BIKE } from './bike.js';
import { createPelican, placeBone, PELICAN } from './pelican.js';
import { solveTwoBone } from './ik.js';

export const RIDER_SPEED = 5; // m/s
const GEAR = 2.2; // wheel turns per crank turn
const MAX_DT = 0.1;
const MAX_ROLL = THREE.MathUtils.degToRad(12);

// Pure: next track position (arc-length fraction) after dt seconds.
export function advance(u, dt, length, speed = RIDER_SPEED) {
  const step = Math.min(dt, MAX_DT) * speed / length;
  return (u + step) % 1;
}

// Pure: track position (arc-length fraction) closest to a ground point.
export function nearestU(track, x, z, samples = 2000) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < samples; i++) {
    const p = track.pointAt(i / samples);
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < bestD) { bestD = d; best = i / samples; }
  }
  return best;
}

export function createRider(ctx, { startU = 0 } = {}) {
  const { track } = ctx;
  const group = new THREE.Group();
  group.name = 'rider';
  const bike = createBike();
  const pelican = createPelican();
  group.add(bike.group, pelican.group);
  ctx.scene.add(group);

  const hips = PELICAN.hips.map((h) => new THREE.Vector3(...h));
  const bend = new THREE.Vector3(0, 0.35, 1).normalize();
  const pL = new THREE.Vector3(), pR = new THREE.Vector3();
  const look = new THREE.Vector3();
  const prevTangent = track.tangentAt(startU);

  const state = {
    group,
    u: startU,
    speed: RIDER_SPEED,
    crank: 0,
    wheel: 0,
    roll: 0,
    getPosition: () => group.position,
    getForward: () => track.tangentAt(state.u),
    step,
  };

  function step(dt, t = 0) {
    dt = Math.min(dt, MAX_DT);
    state.u = advance(state.u, dt, track.length, state.speed);
    const p = track.pointAt(state.u);
    const tan = track.tangentAt(state.u);
    group.position.copy(p);
    look.copy(p).add(tan);
    group.up.set(0, 1, 0);
    group.lookAt(look);

    // Lean into turns: signed horizontal turn rate from tangent change.
    const turn = prevTangent.x * tan.z - prevTangent.z * tan.x;
    const rate = dt > 0 ? turn / (state.speed * dt) : 0; // ~curvature (1/m)
    const target = THREE.MathUtils.clamp(-rate * state.speed * state.speed / 9.8, -MAX_ROLL, MAX_ROLL);
    state.roll += (target - state.roll) * Math.min(1, dt * 3);
    group.rotateZ(state.roll);
    prevTangent.copy(tan);

    // Wheels and crank.
    const dist = state.speed * dt;
    state.wheel += dist / BIKE.wheelR;
    state.crank += dist / BIKE.wheelR / GEAR;
    bike.frontWheel.rotation.x = state.wheel;
    bike.rearWheel.rotation.x = state.wheel;
    bike.crankPivot.rotation.x = state.crank;
    pedalPositions(state.crank, pL, pR);
    bike.pedalL.position.copy(pL);
    bike.pedalR.position.copy(pR);

    // Legs follow the pedals with two-bone IK; knees bend forward and up.
    [pL, pR].forEach((pedal, i) => {
      const hip = hips[i];
      const target = pedal.clone().add(new THREE.Vector3(0, 0.03, 0));
      const { knee, foot } = solveTwoBone(hip, target, PELICAN.thigh, PELICAN.shin, bend);
      const leg = pelican.legs[i];
      placeBone(leg.thigh, hip, knee);
      placeBone(leg.shin, knee, foot);
      leg.foot.position.copy(foot);
    });

    // Little life: bandana flutter and a gentle head bob with each pedal stroke.
    pelican.tails.rotation.y = Math.sin(t * 9) * 0.25;
    pelican.tails.rotation.x = -0.25 + Math.sin(t * 7) * 0.08;
    pelican.body.position.y = Math.abs(Math.sin(state.crank)) * 0.015;
  }

  step(0);
  ctx.addUpdater((dt, t) => step(dt, t));
  return state;
}
