import * as THREE from 'three';
import { palette } from '../util/palette.js';
import { toon } from '../util/materials.js';
import { PartBuilder } from '../util/merge.js';
import { BIKE } from './bike.js';

// Seated pelican in bike-local space (+Z forward). Static parts are merged into
// one mesh; legs are separate so IK can pose them every frame.
export const PELICAN = {
  hips: [[-0.16, 1.06, -0.3], [0.16, 1.06, -0.3]],
  thigh: 0.44,
  shin: 0.46,
};

const vmat = () => toon(0xffffff, { vertexColors: true });

function legMesh(radius, color) {
  // Unit-length bone along +Y from the origin; scaled in Y to the bone length.
  const geo = new THREE.CylinderGeometry(radius * 0.85, radius, 1, 7).translate(0, 0.5, 0);
  const m = new THREE.Mesh(geo, toon(color));
  m.castShadow = true;
  return m;
}

export function createPelican() {
  const group = new THREE.Group();
  const b = new PartBuilder();
  const W = palette.pelicanWhite, G = palette.pelicanShade;

  // Body: big white egg leaning forward over the bike.
  b.add(new THREE.SphereGeometry(1, 16, 12), W, { pos: [0, 1.47, -0.16], rot: [0.45, 0, 0], scale: [0.36, 0.46, 0.4] });
  b.add(new THREE.SphereGeometry(1, 12, 10), W, { pos: [0, 1.13, -0.33], scale: [0.24, 0.12, 0.26] }); // seat feathers
  // Tail feathers, gray tipped like the reference.
  b.add(new THREE.SphereGeometry(1, 10, 8), W, { pos: [0, 1.22, -0.58], rot: [-0.5, 0, 0], scale: [0.2, 0.07, 0.3] });
  b.add(new THREE.SphereGeometry(1, 10, 8), palette.featherGray, { pos: [0, 1.15, -0.78], rot: [-0.5, 0, 0], scale: [0.16, 0.05, 0.14] });

  // Neck: smooth S-curve up and forward.
  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.7, -0.02),
    new THREE.Vector3(0, 1.95, 0.02),
    new THREE.Vector3(0, 2.12, -0.04),
    new THREE.Vector3(0, 2.26, 0.04),
  ]);
  b.add(new THREE.TubeGeometry(neckCurve, 12, 0.1, 8), W);

  // Head, eye with a determined brow, crest spikes.
  const head = [0, 2.32, 0.06];
  b.add(new THREE.SphereGeometry(0.17, 14, 10), W, { pos: head, scale: [0.9, 1, 1.15] });
  for (const s of [-1, 1]) {
    b.add(new THREE.SphereGeometry(0.045, 10, 8), palette.white, { pos: [s * 0.13, head[1] + 0.03, head[2] + 0.07] });
    b.add(new THREE.SphereGeometry(0.024, 8, 6), palette.headphone, { pos: [s * 0.16, head[1] + 0.03, head[2] + 0.09] });
    b.add(new THREE.BoxGeometry(0.02, 0.025, 0.1), palette.headphone, { pos: [s * 0.15, head[1] + 0.085, head[2] + 0.07], rot: [0.5, 0, 0] });
  }
  for (const [y, z, r] of [[0.16, -0.12, -0.9], [0.1, -0.18, -1.2], [0.04, -0.2, -1.5]]) {
    b.add(new THREE.ConeGeometry(0.045, 0.32, 4), W, { pos: [0, head[1] + y, head[2] + z], rot: [r, 0, 0] });
  }

  // Beak: long upper bill with a hooked tip, big pink-red throat pouch below.
  const beakBase = [0, head[1] - 0.02, head[2] + 0.12];
  b.add(new THREE.BoxGeometry(0.13, 0.05, 0.85), palette.beak, { pos: [0, beakBase[1] + 0.02, beakBase[2] + 0.42], rot: [-0.12, 0, 0] });
  b.add(new THREE.BoxGeometry(0.03, 0.02, 0.8), 0xc9772e, { pos: [0, beakBase[1] + 0.055, beakBase[2] + 0.42], rot: [-0.12, 0, 0] });
  b.add(new THREE.ConeGeometry(0.035, 0.1, 4), 0xd9822b, { pos: [0, beakBase[1] + 0.06, beakBase[2] + 0.86], rot: [Math.PI, 0, 0] });
  b.add(new THREE.SphereGeometry(1, 14, 10), palette.pouch, { pos: [0, beakBase[1] - 0.12, beakBase[2] + 0.38], rot: [-0.18, 0, 0], scale: [0.12, 0.17, 0.42] });
  b.add(new THREE.BoxGeometry(0.1, 0.03, 0.75), palette.pouchDark, { pos: [0, beakBase[1] - 0.03, beakBase[2] + 0.4], rot: [-0.1, 0, 0] });

  // Blue cap with white front panel and a brim angled to the side.
  b.add(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), palette.capBlue, { pos: [0, head[1] + 0.06, head[2] - 0.01], scale: [0.98, 0.85, 1.12] });
  b.add(new THREE.SphereGeometry(0.172, 10, 6, -0.5, 1.0, 0.3, 0.9), palette.white, { pos: [0, head[1] + 0.06, head[2] - 0.01], scale: [0.98, 0.85, 1.12] });
  b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 14, 1, false, 0, Math.PI), palette.capBlue, { pos: [0.02, head[1] + 0.07, head[2] + 0.12], rot: [0.15, 0.6, 0] });
  b.add(new THREE.SphereGeometry(0.02, 6, 4), palette.bandanaRed, { pos: [0, head[1] + 0.21, head[2]] });

  // Red bandana with white polka dots around the neck base.
  const bandY = 1.74;
  b.add(new THREE.TorusGeometry(0.15, 0.075, 6, 16), palette.bandanaRed, { pos: [0, bandY, 0], rot: [Math.PI / 2 + 0.25, 0, 0] });
  b.add(new THREE.ConeGeometry(0.12, 0.18, 3), palette.bandanaRed, { pos: [0, bandY - 0.1, 0.12], rot: [Math.PI, 0, 0], scale: [1.4, 1, 0.5] });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    b.add(new THREE.SphereGeometry(0.026, 6, 4), palette.white, { pos: [Math.cos(a) * 0.225, bandY + 0.02 * Math.sin(a * 2), Math.sin(a) * 0.19] });
  }

  // Wings reaching from the shoulders down to the handlebar grips.
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Vector3(s * 0.3, 1.58, -0.08);
    const grip = new THREE.Vector3(s * 0.3, BIKE.grips[0][1] + 0.03, BIKE.grips[0][2]);
    const mid = shoulder.clone().lerp(grip, 0.5);
    const dir = grip.clone().sub(shoulder);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(0.11, len * 0.58, 0.16));
    b.addMatrix(new THREE.SphereGeometry(1, 10, 8), W, m);
    // Gray wingtip "hand" wrapped on the grip.
    b.add(new THREE.SphereGeometry(0.07, 8, 6), G, { pos: [grip.x, grip.y, grip.z], scale: [1, 0.8, 1.3] });
    // Gray flight feathers tucked along the back.
    b.add(new THREE.SphereGeometry(1, 10, 8), palette.featherGray, { pos: [s * 0.3, 1.36, -0.34], rot: [0.6, 0, 0], scale: [0.07, 0.2, 0.12] });
  }

  const body = new THREE.Mesh(b.build(), vmat());
  body.castShadow = true;
  group.add(body);

  // Bandana tails flutter behind the neck.
  const tb = new PartBuilder();
  for (const [y, len] of [[0.03, 0.42], [-0.05, 0.34]]) {
    tb.add(new THREE.BoxGeometry(0.03, 0.09, len).translate(0, 0, -len / 2), palette.bandanaRed, { pos: [0, y, 0] });
    for (let k = 1; k < 3; k++) tb.add(new THREE.SphereGeometry(0.016, 6, 4), palette.white, { pos: [0.02, y, -len * k / 3] });
  }
  const tails = new THREE.Mesh(tb.build(), vmat());
  tails.position.set(0, bandY, -0.17);
  group.add(tails);

  // Legs: thigh, shin, webbed foot, per side.
  const legs = [0, 1].map(() => {
    const thigh = legMesh(0.06, palette.legOrange);
    const shin = legMesh(0.045, palette.legOrange);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), toon(palette.legOrange));
    shin.add(knee);
    const footGeo = new THREE.ConeGeometry(0.1, 0.22, 3).rotateX(Math.PI / 2).translate(0, 0, 0.07);
    footGeo.scale(1, 0.25, 1);
    const foot = new THREE.Mesh(footGeo, toon(palette.legOrange));
    group.add(thigh, shin, foot);
    return { thigh, shin, foot };
  });

  return { group, body, legs, tails, head };
}

const _up = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();

// Point a unit bone mesh from a to b.
export function placeBone(mesh, a, b) {
  _d.subVectors(b, a);
  const len = _d.length();
  mesh.position.copy(a);
  mesh.quaternion.setFromUnitVectors(_up, _d.divideScalar(len || 1));
  mesh.scale.set(1, len, 1);
}
