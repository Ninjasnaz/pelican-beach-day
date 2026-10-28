import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const Y = new THREE.Vector3(0, 1, 0);

// Collects colored, transformed primitives and merges them into one
// vertex-colored geometry (one draw call per merged mesh).
export class PartBuilder {
  constructor() { this.parts = []; }

  add(geometry, color, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
    _e.set(...rot);
    _q.setFromEuler(_e);
    _s.set(...(Array.isArray(scale) ? scale : [scale, scale, scale]));
    _m.compose(new THREE.Vector3(...pos), _q, _s);
    return this.addMatrix(geometry, color, _m);
  }

  addMatrix(geometry, color, matrix) {
    let g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    g.applyMatrix4(matrix);
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    const c = new THREE.Color(color);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    this.parts.push(g);
    return this;
  }

  // Cylinder (or any Y-aligned unit-height geometry) stretched from a to b.
  between(a, b, radius, color, radialSegments = 6) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const geo = new THREE.CylinderGeometry(radius, radius, 1, radialSegments);
    _q.setFromUnitVectors(Y, vb.clone().sub(va).normalize());
    _m.compose(va.clone().add(vb).multiplyScalar(0.5), _q, new THREE.Vector3(1, len, 1));
    return this.addMatrix(geo, color, _m);
  }

  build() {
    const g = mergeGeometries(this.parts, false);
    g.computeBoundingSphere();
    return g;
  }
}
