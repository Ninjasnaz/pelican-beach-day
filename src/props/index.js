import * as THREE from 'three';
import { palette } from '../util/palette.js';
import { toon, mesh } from '../util/materials.js';
import { instanced } from '../util/instancing.js';
import { pick, range } from '../util/rng.js';
import { part, mergeParts, canopyWedges } from '../vendors/geo.js';

// Beach props on the sand between the boardwalk and the water. Umbrellas and
// towels are instanced; the small one-offs merge into a single vertex-colored mesh.
const X_RANGE = [-82, 82];
const Z_RANGE = [-44, -27]; // dry sand; the shoreline dips under water past about -46
const UMBRELLA_COUNT = 24;

const SHADES = [palette.cartRed, palette.cartYellow, palette.cartTeal, palette.cartBlue, palette.cartPink, palette.cartOrange, palette.cartPurple, palette.cartGreen];
const TOWELS = [0xff6b6b, 0xffd166, 0x4cc9f0, 0xb388eb, 0xf9f9f9, 0x80ed99, 0xff9f1c, 0xf72585];

const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 8);
const cone = new THREE.ConeGeometry(1, 1, 8);
const sphere = new THREE.SphereGeometry(1, 8, 6);

function freeSpot(ctx, radius, tries = 40, zr = Z_RANGE) {
  for (let i = 0; i < tries; i++) {
    const x = range(ctx.rng, X_RANGE[0], X_RANGE[1]), z = range(ctx.rng, zr[0], zr[1]);
    if (ctx.zone(x, z) === 'water') continue;
    if (ctx.reserve(x, z, radius)) return { x, z, y: ctx.heightAt(x, z) };
  }
  return null;
}

// Beach ball with colored wedges (per-triangle color by longitude).
function ballParts(x, y, z, r, rot) {
  const g = new THREE.SphereGeometry(1, 12, 8).toNonIndexed();
  g.deleteAttribute('uv');
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const wedge = [palette.cartRed, 0xffffff, palette.cartBlue, 0xffffff, palette.cartYellow, 0xffffff];
  const c = new THREE.Color();
  for (let t = 0; t < pos.count; t += 3) {
    const cx = (pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3;
    const cz = (pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)) / 3;
    const k = Math.floor(((Math.atan2(cz, cx) + Math.PI) / (Math.PI * 2)) * 6) % 6;
    c.setHex(wedge[k]);
    for (let v = 0; v < 3; v++) colors.set([c.r, c.g, c.b], (t + v) * 9 / 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rot, rot * 2, 0)), new THREE.Vector3(r, r, r)));
  return g;
}

export function createProps(ctx) {
  const group = new THREE.Group();
  group.name = 'props';
  const counts = { umbrellas: 0, coolers: 0, sandcastles: 0, balls: 0, flags: 0 };

  // Reserve the big things first: umbrellas, then the little ones fit around them.
  const spots = [];
  for (let i = 0; i < UMBRELLA_COUNT; i++) {
    const p = freeSpot(ctx, 2.2);
    if (p) spots.push(p);
  }

  // ---- Umbrellas: pole + two sets of alternating wedges (tinted / white), one transform each.
  const tilted = spots.map((p) => ({ ...p, ry: ctx.rng() * Math.PI * 2, rz: range(ctx.rng, -0.14, 0.14), rx: range(ctx.rng, -0.1, 0.1), s: range(ctx.rng, 0.9, 1.15) }));
  const R = 1.55, RISE = 0.5, TOP = 2.15;
  // Wedges are white in the vertex colors so the per-instance tint colors them;
  // the other set (plus the pole) stays white, giving alternating stripes in 2 draw calls.
  const wedgeA = canopyWedges(R, RISE, { segments: 8, parity: 0 }).translate(0, TOP - 0.05, 0);
  const wedgeB = mergeParts([
    canopyWedges(R, RISE, { segments: 8, parity: 1 }).translate(0, TOP - 0.05, 0),
    part(cyl, 0xffffff, { y: (TOP + 0.1) / 2, sx: 0.035, sy: TOP + 0.1, sz: 0.035 }),
  ]);

  const canopy = instanced(wedgeA, toon(0xffffff, { side: THREE.DoubleSide, vertexColors: true }), tilted, { receive: false });
  canopy.name = 'umbrellaCanopy';
  const canopyWhite = instanced(wedgeB, toon(0xfdfdfd, { side: THREE.DoubleSide, vertexColors: true }), tilted, { receive: false });
  canopyWhite.name = 'umbrellaCanopyWhite';
  const tint = new THREE.Color();
  tilted.forEach((_, i) => {
    tint.setHex(SHADES[i % SHADES.length]);
    canopy.setColorAt(i, tint);
  });
  canopy.instanceColor.needsUpdate = true;
  counts.umbrellas = tilted.length;

  // ---- Towels: one under each umbrella, a second beside some of them.
  const towelItems = [];
  tilted.forEach((p, i) => {
    towelItems.push({ x: p.x + Math.sin(p.ry) * 0.2, z: p.z + Math.cos(p.ry) * 0.2, y: p.y + 0.03, ry: p.ry });
    if (i % 2 === 0) towelItems.push({ x: p.x + Math.cos(p.ry) * 1.0, z: p.z - Math.sin(p.ry) * 1.0, y: p.y + 0.03, ry: p.ry + 0.3 });
  });
  const towelGeo = new THREE.PlaneGeometry(0.85, 1.8).rotateX(-Math.PI / 2);
  const towels = instanced(towelGeo, toon(0xffffff), towelItems, { cast: false });
  towels.name = 'towels';
  towelItems.forEach((_, i) => towels.setColorAt(i, tint.setHex(TOWELS[(i * 3) % TOWELS.length])));
  towels.instanceColor.needsUpdate = true;

  // ---- One-offs merged into a single mesh.
  const bits = [];

  // Coolers beside the umbrellas.
  for (let i = 0; i < Math.min(8, tilted.length); i++) {
    const u = tilted[(i * 3) % tilted.length];
    const a = u.ry + 1.2 + i;
    const x = u.x + Math.sin(a) * 1.5, z = u.z + Math.cos(a) * 1.5, y = ctx.heightAt(x, z);
    const body = pick(ctx.rng, [palette.cartRed, palette.cartBlue, palette.cartTeal]);
    bits.push(part(box, body, { x, y: y + 0.22, z, ry: a, sx: 0.7, sy: 0.44, sz: 0.44 }));
    bits.push(part(box, 0xffffff, { x, y: y + 0.47, z, ry: a, sx: 0.74, sy: 0.08, sz: 0.48 }));
    bits.push(part(box, palette.chrome, { x, y: y + 0.55, z, ry: a, sx: 0.3, sy: 0.04, sz: 0.06 }));
    counts.coolers++;
  }

  // Sandcastles close to the water.
  for (let i = 0; i < 4; i++) {
    const p = freeSpot(ctx, 1.1, 40, [-43, -36]);
    if (!p) continue;
    const sand = 0xe3bd7a, dark = 0xc99a58;
    bits.push(part(cyl, sand, { x: p.x, y: p.y + 0.2, z: p.z, sx: 0.8, sy: 0.4, sz: 0.8 }));
    bits.push(part(cyl, sand, { x: p.x, y: p.y + 0.65, z: p.z, sx: 0.38, sy: 0.5, sz: 0.38 }));
    bits.push(part(cone, dark, { x: p.x, y: p.y + 1.15, z: p.z, sx: 0.42, sy: 0.4, sz: 0.42 }));
    for (const [dx, dz] of [[0.75, 0.2], [-0.6, 0.5], [-0.2, -0.75], [0.4, -0.65]]) {
      bits.push(part(cyl, sand, { x: p.x + dx, y: p.y + 0.4, z: p.z + dz, sx: 0.2, sy: 0.8, sz: 0.2 }));
      bits.push(part(cone, dark, { x: p.x + dx, y: p.y + 0.9, z: p.z + dz, sx: 0.23, sy: 0.25, sz: 0.23 }));
    }
    bits.push(part(box, palette.lifeguardRed, { x: p.x + 0.12, y: p.y + 1.5, z: p.z, sx: 0.24, sy: 0.14, sz: 0.02 }));
    bits.push(part(cyl, 0xffffff, { x: p.x, y: p.y + 1.4, z: p.z, sx: 0.012, sy: 0.4, sz: 0.012 }));
    counts.sandcastles++;
  }

  // Beach balls.
  const ballGeos = [];
  for (let i = 0; i < 9; i++) {
    const p = freeSpot(ctx, 0.5, 30, [-44, -25]);
    if (!p) continue;
    ballGeos.push(ballParts(p.x, p.y + 0.3, p.z, 0.3, ctx.rng() * 3));
    counts.balls++;
  }

  // Lifeguard flags: red and yellow pair on tall poles near the waterline.
  for (let i = 0; i < 3; i++) {
    const p = freeSpot(ctx, 1.4, 60, [-44, -40]);
    if (!p) continue;
    const a = range(ctx.rng, -0.3, 0.3);
    [[-0.9, palette.lifeguardRed], [0.9, palette.lifeguardYellow]].forEach(([dx, color]) => {
      const x = p.x + dx * Math.cos(a), z = p.z - dx * Math.sin(a), y = ctx.heightAt(x, z);
      bits.push(part(cyl, 0xffffff, { x, y: y + 1.3, z, sx: 0.04, sy: 2.6, sz: 0.04 }));
      bits.push(part(box, color, { x: x + 0.45, y: y + 2.2, z, ry: -a, sx: 0.9, sy: 0.55, sz: 0.035 }));
      bits.push(part(sphere, 0xffffff, { x, y: y + 2.62, z, s: 0.06 }));
      counts.flags++;
    });
  }

  const stuff = mesh(mergeParts([...bits, ...ballGeos]), toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide }), { cast: true, receive: true });
  stuff.name = 'beachStuff';

  group.add(canopy, canopyWhite, towels, stuff);
  group.userData.counts = counts;
  ctx.scene.add(group);
  return group;
}
