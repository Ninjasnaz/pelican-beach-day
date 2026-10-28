import * as THREE from 'three';
import { pick } from '../util/rng.js';
import { toon, mesh } from '../util/materials.js';
import { part, mergeParts } from './geo.js';

// Placeholder vendor: capsule body, sphere head, apron and paper hat. The lead
// may swap this for the crowd module's createPerson later; keep the 'head' child.
const SKIN = [0xf6d3b3, 0xe9b98d, 0xc98f62, 0x9a6540, 0x6b4229];
const SHIRT = [0x3a86ff, 0xffffff, 0xff8c42, 0x2ec4b6, 0xffc93c];
const APRON = [0xe63946, 0xffffff, 0x57cc62, 0xffc93c];
const PANTS = [0x2f4858, 0x4a4e69, 0x6b4a2b];

const capsule = new THREE.CapsuleGeometry(1, 1, 2, 6);
const sphere = new THREE.SphereGeometry(1, 8, 6);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
const box = new THREE.BoxGeometry(1, 1, 1);

// Faces +Z, feet at the origin, about 1.8 m tall.
export function createVendorFigure(rng) {
  const skin = pick(rng, SKIN), shirt = pick(rng, SHIRT), apron = pick(rng, APRON), pants = pick(rng, PANTS);
  const g = new THREE.Group();
  g.name = 'vendor';

  const body = mergeParts([
    part(capsule, pants, { x: -0.11, y: 0.4, sx: 0.1, sy: 0.3, sz: 0.1 }),
    part(capsule, pants, { x: 0.11, y: 0.4, sx: 0.1, sy: 0.3, sz: 0.1 }),
    part(capsule, shirt, { y: 1.05, sx: 0.25, sy: 0.22, sz: 0.2 }),
    part(box, apron, { y: 0.98, z: 0.2, sx: 0.4, sy: 0.55, sz: 0.04 }),
    part(box, apron, { y: 1.3, z: 0.2, sx: 0.2, sy: 0.14, sz: 0.04 }),
    // Arms reach forward over the counter.
    part(capsule, shirt, { x: -0.3, y: 1.1, z: 0.14, rx: 1.0, sx: 0.07, sy: 0.17, sz: 0.07 }),
    part(capsule, shirt, { x: 0.3, y: 1.1, z: 0.14, rx: 1.0, sx: 0.07, sy: 0.17, sz: 0.07 }),
    part(sphere, skin, { x: -0.3, y: 1.0, z: 0.38, s: 0.07 }),
    part(sphere, skin, { x: 0.3, y: 1.0, z: 0.38, s: 0.07 }),
  ]);
  const bodyMesh = mesh(body, toon(0xffffff, { vertexColors: true }), { cast: false, receive: false });
  bodyMesh.name = 'body';

  // Head geometry is built around the neck pivot so it can nod and turn.
  const head = mergeParts([
    part(sphere, skin, { y: 0.2, s: 0.2 }),
    part(sphere, 0x222222, { x: -0.07, y: 0.22, z: 0.18, s: 0.025 }),
    part(sphere, 0x222222, { x: 0.07, y: 0.22, z: 0.18, s: 0.025 }),
    part(cyl, 0xffffff, { y: 0.42, sx: 0.17, sy: 0.2, sz: 0.17 }),
    part(cyl, apron, { y: 0.34, sx: 0.185, sy: 0.04, sz: 0.185 }),
  ]);
  const headMesh = mesh(head, toon(0xffffff, { vertexColors: true }), { cast: false, receive: false });
  headMesh.name = 'head';
  headMesh.position.y = 1.4;

  g.add(bodyMesh, headMesh);
  return g;
}
