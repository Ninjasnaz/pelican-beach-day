import * as THREE from 'three';
import { palette } from '../util/palette.js';
import { toon } from '../util/materials.js';
import { PartBuilder } from '../util/merge.js';

// Bike geometry in meters, local +Z forward, wheels touching y = 0.
export const BIKE = {
  wheelR: 0.36,
  rearHub: [0, 0.36, -0.56],
  frontHub: [0, 0.36, 0.56],
  bb: [0, 0.36, -0.06],
  crankLen: 0.17,
  pedalX: 0.15,
  seat: [0, 1.0, -0.36],
  bar: [0, 1.12, 0.42],
  grips: [[-0.3, 1.13, 0.36], [0.3, 1.13, 0.36]],
};

const vmat = () => toon(0xffffff, { vertexColors: true });

function makeWheel() {
  const b = new PartBuilder();
  b.add(new THREE.TorusGeometry(BIKE.wheelR - 0.03, 0.035, 6, 28), palette.tire, { rot: [0, Math.PI / 2, 0] });
  b.add(new THREE.TorusGeometry(BIKE.wheelR - 0.075, 0.018, 4, 28), palette.rim, { rot: [0, Math.PI / 2, 0] });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.between([0, 0, 0], [0, Math.sin(a) * (BIKE.wheelR - 0.08), Math.cos(a) * (BIKE.wheelR - 0.08)], 0.006, palette.chrome, 3);
  }
  b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8), palette.chrome, { rot: [0, 0, Math.PI / 2] });
  const m = new THREE.Mesh(b.build(), vmat());
  m.castShadow = true;
  return m;
}

export function createBike() {
  const group = new THREE.Group();
  const { rearHub: R, frontHub: F, bb: BB, seat: S, bar: H } = BIKE;
  const head = [0, 0.98, 0.38];
  const headLow = [0, 0.78, 0.43];
  const seatCluster = [0, 0.9, -0.32];

  const b = new PartBuilder();
  const tube = 0.032;
  b.between(BB, seatCluster, tube, palette.bikeTeal);
  b.between(BB, headLow, tube, palette.bikeTeal);
  b.between(seatCluster, head, tube, palette.bikeTeal);
  b.between(head, headLow, tube * 1.2, palette.bikeTealDark);
  for (const x of [-0.05, 0.05]) {
    b.between([x, BB[1], BB[2]], [x, R[1], R[2]], 0.02, palette.bikeTeal);
    b.between([x, seatCluster[1], seatCluster[2]], [x, R[1], R[2]], 0.02, palette.bikeTeal);
    b.between([x, headLow[1], headLow[2]], [x, F[1], F[2]], 0.022, palette.bikeTealDark);
  }
  // Seat post, saddle, stem, handlebar, grips.
  b.between(seatCluster, [0, S[1] - 0.03, S[2] - 0.02], 0.02, palette.chrome);
  b.add(new THREE.BoxGeometry(0.16, 0.06, 0.3), palette.tire, { pos: [S[0], S[1], S[2]] });
  b.between(head, H, 0.022, palette.chrome);
  b.between(BIKE.grips[0], BIKE.grips[1], 0.018, palette.chrome);
  for (const g of BIKE.grips) b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 6), palette.tire, { pos: g, rot: [0, 0, Math.PI / 2] });
  // Fenders.
  b.add(new THREE.TorusGeometry(BIKE.wheelR + 0.03, 0.025, 4, 16, Math.PI * 0.55), palette.bikeTeal, { pos: R, rot: [0, Math.PI / 2, Math.PI * 0.3], scale: [1, 1, 2.4] });
  // Chain loop (top and bottom runs) and rear cog.
  b.between([0.07, BB[1] + 0.1, BB[2]], [0.07, R[1] + 0.05, R[2]], 0.008, palette.headphone, 3);
  b.between([0.07, BB[1] - 0.1, BB[2]], [0.07, R[1] - 0.05, R[2]], 0.008, palette.headphone, 3);
  b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10), palette.chrome, { pos: [0.07, R[1], R[2]], rot: [0, 0, Math.PI / 2] });
  // Wicker basket on the front with a little blue fish in headphones.
  const bk = [0, 1.02, 0.66];
  const wick = palette.wicker;
  b.add(new THREE.BoxGeometry(0.42, 0.03, 0.32), wick, { pos: [bk[0], bk[1] - 0.12, bk[2]] });
  b.add(new THREE.BoxGeometry(0.42, 0.24, 0.025), wick, { pos: [bk[0], bk[1], bk[2] + 0.15] });
  b.add(new THREE.BoxGeometry(0.42, 0.24, 0.025), wick, { pos: [bk[0], bk[1], bk[2] - 0.15] });
  b.add(new THREE.BoxGeometry(0.025, 0.24, 0.32), wick, { pos: [bk[0] - 0.2, bk[1], bk[2]] });
  b.add(new THREE.BoxGeometry(0.025, 0.24, 0.32), wick, { pos: [bk[0] + 0.2, bk[1], bk[2]] });
  for (const y of [-0.06, 0.02, 0.1]) b.add(new THREE.BoxGeometry(0.44, 0.02, 0.34), 0xa86f2f, { pos: [bk[0], bk[1] + y, bk[2]] });
  b.between([0, 0.9, 0.5], [0, bk[1] - 0.12, bk[2] - 0.1], 0.012, palette.chrome);
  const fish = [0.02, bk[1] + 0.15, bk[2]];
  b.add(new THREE.SphereGeometry(0.11, 10, 8), palette.fishBlue, { pos: fish, scale: [0.8, 1, 1.25] });
  b.add(new THREE.ConeGeometry(0.07, 0.12, 4), palette.fishBlue, { pos: [fish[0], fish[1] - 0.02, fish[2] - 0.17], rot: [Math.PI / 2, 0, 0], scale: [0.4, 1, 1.4] });
  b.add(new THREE.SphereGeometry(0.03, 8, 6), palette.white, { pos: [fish[0] + 0.07, fish[1] + 0.04, fish[2] + 0.07] });
  b.add(new THREE.SphereGeometry(0.016, 6, 4), palette.headphone, { pos: [fish[0] + 0.095, fish[1] + 0.045, fish[2] + 0.08] });
  b.add(new THREE.TorusGeometry(0.1, 0.012, 4, 12, Math.PI), palette.headphone, { pos: [fish[0], fish[1] + 0.02, fish[2]] , rot: [0, Math.PI / 2, 0] });
  for (const x of [-0.095, 0.095]) b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.035, 10), 0xe8574a, { pos: [fish[0] + x, fish[1] + 0.02, fish[2]], rot: [0, 0, Math.PI / 2] });
  // Headlight under the basket.
  b.add(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 10), palette.chrome, { pos: [0, 0.86, bk[2] + 0.17], rot: [Math.PI / 2, 0, 0] });
  b.add(new THREE.CircleGeometry(0.045, 10), palette.lightBeam, { pos: [0, 0.86, bk[2] + 0.216] });

  const frame = new THREE.Mesh(b.build(), vmat());
  frame.castShadow = true;
  group.add(frame);

  // Soft headlight beam (no real light; cheap and stylized).
  const beamGeo = new THREE.ConeGeometry(0.55, 2.4, 16, 1, true).rotateX(-Math.PI / 2).translate(0, 0, 1.2);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: palette.lightBeam, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(0, 0.86, bk[2] + 0.22);
  beam.rotation.x = 0.12;
  group.add(beam);

  const rearWheel = makeWheel(); rearWheel.position.set(...R);
  const frontWheel = makeWheel(); frontWheel.position.set(...F);
  group.add(rearWheel, frontWheel);

  // Crank: chainring + two arms, rotates around X at the bottom bracket.
  const cb = new PartBuilder();
  cb.add(new THREE.TorusGeometry(0.1, 0.014, 4, 18), palette.chrome, { pos: [0.07, 0, 0], rot: [0, Math.PI / 2, 0] });
  cb.between([0.1, 0, 0], [0.1, -BIKE.crankLen, 0], 0.018, palette.chrome);
  cb.between([-0.1, 0, 0], [-0.1, BIKE.crankLen, 0], 0.018, palette.chrome);
  cb.add(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 8), palette.chrome, { rot: [0, 0, Math.PI / 2] });
  const crankPivot = new THREE.Mesh(cb.build(), vmat());
  crankPivot.position.set(...BB);
  crankPivot.castShadow = true;
  group.add(crankPivot);

  const pedalGeo = new THREE.BoxGeometry(0.1, 0.025, 0.07);
  const pedalL = new THREE.Mesh(pedalGeo, toon(palette.tire));
  const pedalR = new THREE.Mesh(pedalGeo, toon(palette.tire));
  group.add(pedalL, pedalR);

  return { group, crankPivot, pedalL, pedalR, frontWheel, rearWheel, beam };
}

// Pedal positions in bike-local space for a crank angle (0 = right pedal down).
// Increasing angle = pedaling forward (bottom pedal sweeps backward). Matches
// crankPivot.rotation.x = angle.
export function pedalPositions(angle, outL = new THREE.Vector3(), outR = new THREE.Vector3()) {
  const [, by, bz] = BIKE.bb;
  const r = BIKE.crankLen;
  outR.set(BIKE.pedalX, by - Math.cos(angle) * r, bz - Math.sin(angle) * r);
  outL.set(-BIKE.pedalX, by + Math.cos(angle) * r, bz + Math.sin(angle) * r);
  return { left: outL, right: outR };
}
