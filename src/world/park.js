import * as THREE from 'three';
import { palette } from '../util/palette.js';
import { toon } from '../util/materials.js';
import { instanced } from '../util/instancing.js';
import { PARK_Z } from '../util/layout.js';

// Keep a clear sightline from the opening camera to the boardwalk and ocean.
const inViewCorridor = (x, z) => Math.abs(x) < 7 + (z - 45) * 0.2 && z > 45 && z < 90;

function scatter(ctx, count, { xMin, xMax, zMin, zMax, radius, tries = 20 }) {
  const out = [];
  for (let i = 0; i < count; i++) {
    for (let t = 0; t < tries; t++) {
      const x = xMin + ctx.rng() * (xMax - xMin);
      const z = zMin + ctx.rng() * (zMax - zMin);
      if (inViewCorridor(x, z)) continue;
      if (ctx.reserve(x, z, radius)) { out.push({ x, z, y: ctx.heightAt(x, z) }); break; }
    }
  }
  return out;
}

export function createPark(ctx) {
  const group = new THREE.Group();
  group.name = 'park';

  const trunkMat = toon(palette.trunk);
  const leaf = toon(palette.leaf, { flatShading: true });
  const leafLight = toon(palette.leafLight, { flatShading: true });

  // Round trees.
  const round = scatter(ctx, 55, { xMin: -170, xMax: 170, zMin: PARK_Z + 4, zMax: 130, radius: 2.6 });
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 1, 6).translate(0, 0.5, 0);
  group.add(instanced(trunkGeo, trunkMat, round.map((p) => ({ ...p, sx: 1, sy: 2.6, sz: 1 }))));
  const blob = new THREE.IcosahedronGeometry(1, 1);
  group.add(instanced(blob, leaf, round.map((p, i) => ({ ...p, y: p.y + 3.6, s: 2.1 + (i % 4) * 0.25, ry: i }))));
  group.add(instanced(blob, leafLight, round.map((p, i) => ({ x: p.x + 0.7, z: p.z + 0.5, y: p.y + 4.6, s: 1.4 + (i % 3) * 0.2, ry: i }))));

  // Pines.
  const pines = scatter(ctx, 30, { xMin: -220, xMax: 220, zMin: 60, zMax: 220, radius: 2.2 });
  group.add(instanced(trunkGeo, trunkMat, pines.map((p) => ({ ...p, sx: 0.8, sy: 1.6, sz: 0.8 }))));
  const cone = new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0);
  for (const [h, w, l] of [[1.2, 2.2, 3.0], [2.4, 1.7, 2.6], [3.5, 1.1, 2.2]]) {
    group.add(instanced(cone, leaf, pines.map((p) => ({ ...p, y: p.y + h, sx: w, sy: l, sz: w }))));
  }

  // Palms along the sand between the boardwalk loop and the park.
  const palms = scatter(ctx, 16, { xMin: -150, xMax: 150, zMin: -40, zMax: PARK_Z + 2, radius: 1.8 });
  const palmTrunk = new THREE.CylinderGeometry(0.18, 0.28, 1, 6).translate(0, 0.5, 0);
  group.add(instanced(palmTrunk, toon(0xb98b5e), palms.map((p, i) => ({ ...p, sy: 6.5, rz: 0.12 * Math.sin(i * 2.3), rx: 0.1 * Math.cos(i) }))));
  const frond = new THREE.ConeGeometry(0.5, 3.6, 4).rotateZ(-Math.PI / 2).translate(1.7, 0, 0);
  frond.scale(1, 0.25, 1);
  const fronds = [];
  palms.forEach((p, i) => {
    const topX = p.x + 6.5 * Math.sin(0.12 * Math.sin(i * 2.3)) * -1;
    for (let k = 0; k < 7; k++) fronds.push({ x: topX, z: p.z, y: p.y + 6.4, ry: (k / 7) * Math.PI * 2 + i, rz: -0.35 });
  });
  group.add(instanced(frond, leafLight, fronds));

  // Shrubs.
  const shrubs = scatter(ctx, 120, { xMin: -170, xMax: 170, zMin: PARK_Z + 1, zMax: 110, radius: 1.1 });
  group.add(instanced(new THREE.IcosahedronGeometry(1, 0), leaf, shrubs.map((p, i) => ({ ...p, y: p.y + 0.4, sx: 1.1 + (i % 3) * 0.3, sy: 0.8, sz: 1 + (i % 2) * 0.3, ry: i }))));

  // Flowers dotted around shrubs.
  const flowerColors = [0xf26b8a, 0xffd23f, 0xffffff, 0xb784f2];
  flowerColors.forEach((c, ci) => {
    const pts = shrubs.filter((_, i) => i % 4 === ci).flatMap((p) => [0, 1, 2].map((k) => ({ x: p.x + Math.cos(k * 2.1 + ci) * 1.6, z: p.z + Math.sin(k * 2.1 + ci) * 1.6, y: p.y + 0.2, s: 0.18 })));
    group.add(instanced(new THREE.IcosahedronGeometry(1, 0), toon(c), pts, { cast: false }));
  });

  // Grass tufts (no footprint reservation; just stay off the boardwalk).
  const tufts = [];
  while (tufts.length < 4200) {
    const x = -150 + ctx.rng() * 300, z = PARK_Z + ctx.rng() * 100;
    if (ctx.track.distanceTo(x, z) < 2.5) continue;
    tufts.push({ x, z, y: ctx.heightAt(x, z), sx: 0.25, sy: 0.35 + ctx.rng() * 0.3, sz: 0.25, ry: ctx.rng() * 6 });
  }
  const blade = new THREE.ConeGeometry(0.5, 1, 3).translate(0, 0.5, 0);
  group.add(instanced(blade, toon(palette.grassDark), tufts, { cast: false }));

  ctx.scene.add(group);
  return group;
}
