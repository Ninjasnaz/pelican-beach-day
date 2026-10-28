import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const col = new THREE.Color();
const mat = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const eul = new THREE.Euler();

// Bake a flat vertex color into a (non-indexed, uv-less) geometry so parts can be merged.
export function paint(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  col.setHex(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

// Clone a primitive, move it, and paint it: one entry for mergeParts().
export function part(geo, hex, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, sx = s, sy = s, sz = s } = {}) {
  const g = geo.clone();
  quat.setFromEuler(eul.set(rx, ry, rz));
  g.applyMatrix4(mat.compose(new THREE.Vector3(x, y, z), quat, new THREE.Vector3(sx, sy, sz)));
  return paint(g, hex);
}

export function mergeParts(parts) {
  const g = mergeGeometries(parts, false);
  g.computeBoundingSphere();
  parts.forEach((p) => p.dispose());
  return g;
}

// Umbrella canopy built from wedges around the apex. `parity` (0 or 1) emits
// only the even or odd wedges, or null for all, colored A/B alternately.
export function canopyWedges(radius, rise, { segments = 8, parity = null, colorA = 0xffffff, colorB = 0xffffff } = {}) {
  const pos = [];
  const colors = [];
  const apex = [0, rise, 0];
  const ring = (r, y, a) => [r * Math.sin(a), y, r * Math.cos(a)];
  for (let i = 0; i < segments; i++) {
    if (parity !== null && i % 2 !== parity) continue;
    const a0 = (i / segments) * Math.PI * 2, a1 = ((i + 1) / segments) * Math.PI * 2;
    const m0 = ring(radius * 0.6, rise * 0.55, a0), m1 = ring(radius * 0.6, rise * 0.55, a1);
    const r0 = ring(radius, 0, a0), r1 = ring(radius, 0, a1);
    pos.push(...apex, ...m0, ...m1, ...m0, ...r0, ...r1, ...m0, ...r1, ...m1);
    col.setHex(i % 2 === 0 ? colorA : colorB);
    for (let k = 0; k < 9; k++) colors.push(col.r, col.g, col.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}
