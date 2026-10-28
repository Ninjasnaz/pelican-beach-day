import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, mesh } from '../util/materials.js';

// Tiny helper for chunky low-poly buildings: collect colored primitives, then
// merge them into ONE vertex-colored mesh (one draw call per building).
// Positions are the primitive's footprint center; `y` is the bottom of boxes,
// cylinders and cones, and the center of spheres and tori.

const tmpColor = new THREE.Color();
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylGeos = new Map();
const coneGeos = new Map();
const sphereGeos = new Map();
const torusGeos = new Map();
const prismGeos = new Map();

function cached(map, key, make) {
  if (!map.has(key)) map.set(key, make());
  return map.get(key);
}

export class Kit {
  constructor() {
    this.parts = [];
  }

  // Add a unit-ish geometry with a transform and a flat color.
  add(geo, color, x, y, z, { rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, order = 'XYZ' } = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute('uv');
    tmpE.set(rx, ry, rz, order);
    tmpQ.setFromEuler(tmpE);
    tmpM.compose(tmpV.set(x, y, z), tmpQ, tmpS.set(sx, sy, sz));
    g.applyMatrix4(tmpM);
    tmpColor.set(color);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([tmpColor.r, tmpColor.g, tmpColor.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
    return this;
  }

  box(w, h, d, color, x, y, z, o = {}) {
    return this.add(boxGeo, color, x, y + h / 2, z, { ...o, sx: w, sy: h, sz: d });
  }

  cyl(rTop, rBot, h, color, x, y, z, o = {}) {
    const seg = o.seg ?? 8;
    const geo = cached(cylGeos, `${rTop / rBot}|${seg}`, () => new THREE.CylinderGeometry(rTop / rBot, 1, 1, seg));
    return this.add(geo, color, x, y + h / 2, z, { ...o, sx: rBot, sy: h, sz: rBot });
  }

  // Cone with apex up.
  cone(r, h, color, x, y, z, o = {}) {
    const seg = o.seg ?? 8;
    const geo = cached(coneGeos, seg, () => new THREE.ConeGeometry(1, 1, seg));
    return this.add(geo, color, x, y + h / 2, z, { ...o, sx: r, sy: h, sz: r });
  }

  // Sphere (optionally squashed with sx/sy/sz as radii multipliers).
  sphere(r, color, x, y, z, o = {}) {
    const seg = o.seg ?? 8;
    const geo = cached(sphereGeos, seg, () => new THREE.SphereGeometry(1, seg, Math.max(4, seg - 2)));
    return this.add(geo, color, x, y, z, { ...o, sx: r * (o.sx ?? 1), sy: r * (o.sy ?? 1), sz: r * (o.sz ?? 1) });
  }

  ellipsoid(a, b, c, color, x, y, z, o = {}) {
    return this.sphere(1, color, x, y, z, { ...o, sx: a, sy: b, sz: c });
  }

  torus(R, tube, color, x, y, z, o = {}) {
    const seg = o.seg ?? 12;
    const geo = cached(torusGeos, `${tube / R}|${seg}`, () => new THREE.TorusGeometry(1, tube / R, 5, seg));
    return this.add(geo, color, x, y, z, { ...o, sx: R, sy: R, sz: R });
  }

  // Gable roof / triangular prism: base width w (x), height h, length len (z).
  prism(w, h, len, color, x, y, z, o = {}) {
    const shape = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
    const geo = cached(prismGeos, 'prism', () => {
      const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
      g.translate(0, 0, -0.5);
      return g;
    });
    return this.add(geo, color, x, y, z, { ...o, sx: w, sy: h, sz: len });
  }

  // Merge everything into one shadow-casting mesh.
  build() {
    const geo = mergeGeometries(this.parts, false);
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return mesh(geo, toon(0xffffff, { vertexColors: true }));
  }
}

// Wrap a kit in a root Group. The merged mesh sits in `inner`, shifted so the
// footprint's center is the root's origin; extra meshes (flags etc.) go in `inner`
// too. `userData.radius` is the bounding circle of the footprint.
export function finish(kit, name, { center = true } = {}) {
  const root = new THREE.Group();
  root.name = name;
  const inner = new THREE.Group();
  const body = kit.build();
  const box = body.geometry.boundingBox;
  if (center) inner.position.set(-(box.min.x + box.max.x) / 2, 0, -(box.min.z + box.max.z) / 2);
  const hw = (box.max.x - box.min.x) / 2, hd = (box.max.z - box.min.z) / 2;
  root.userData.radius = Math.hypot(hw, hd);
  inner.add(body);
  root.add(inner);
  root.userData.inner = inner;
  return root;
}

// A thin bar between two points in the xy plane (front-facing signs).
export function lineXY(kit, [x1, y1], [x2, y2], t, color, z, depth = 0.06) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  kit.box(t, len, depth, color, (x1 + x2) / 2, (y1 + y2) / 2 - len / 2, z, { rz: Math.atan2(-(x2 - x1), y2 - y1) });
}

// A bike (side view along z, facing +z, yawed by `yaw`): ring wheels, slim frame lines,
// saddle and handlebar. Used by the rental shop.
export function addBike(kit, x, z, yaw, color, palette, y0 = 0, s = 1.25) {
  const R = 0.34 * s, hub = y0 + R + 0.03 * s;
  const sn = Math.sin(yaw), cs = Math.cos(yaw);
  const at = (lz) => [x + lz * sn, z + lz * cs]; // world xz for a local z offset
  const o = { order: 'YXZ' };
  for (const lz of [-0.55 * s, 0.55 * s]) {
    const [wx, wz] = at(lz);
    kit.torus(R, 0.05 * s, palette.tire, wx, hub, wz, { ry: Math.PI / 2 + yaw, ...o, seg: 10 });
    kit.cyl(0.035 * s, 0.035 * s, 0.07 * s, palette.chrome, wx, hub - 0.035 * s, wz, { rz: Math.PI / 2, ry: yaw, ...o, seg: 5 });
  }
  const P = { rear: [-0.55 * s, hub], front: [0.55 * s, hub], bb: [-0.08 * s, hub - 0.02 * s], seat: [-0.38 * s, hub + 0.62 * s], head: [0.4 * s, hub + 0.6 * s] };
  const line = (a, b) => {
    const dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy);
    const [mx, mz] = at((a[0] + b[0]) / 2);
    kit.box(0.06 * s, len, 0.06 * s, color, mx, (a[1] + b[1]) / 2 - len / 2, mz, { rx: Math.atan2(dz, dy), ry: yaw, ...o });
  };
  line(P.rear, P.bb); line(P.bb, P.seat); line(P.seat, P.rear);
  line(P.bb, P.head); line(P.seat, P.head); line(P.head, P.front);
  const [sx, sz] = at(P.seat[0] - 0.04 * s), [hx, hz] = at(P.head[0] + 0.03 * s);
  kit.box(0.1 * s, 0.05 * s, 0.26 * s, palette.shadowDark, sx, P.seat[1] + 0.02, sz, { ry: yaw });
  kit.box(0.42 * s, 0.05 * s, 0.05 * s, palette.chrome, hx, P.head[1] + 0.06, hz, { ry: yaw });
}
