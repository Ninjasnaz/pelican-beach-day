import { palette } from '../util/palette.js';
import { buildBathroom } from './bathroom.js';
import { buildClubhouse } from './clubhouse.js';
import { buildIceCream } from './iceCream.js';
import { buildLifeguardTower } from './lifeguardTower.js';
import { buildSurfShack } from './surfShack.js';
import { buildSnackBar } from './snackBar.js';
import { buildBikeRental } from './bikeRental.js';
import { buildPier, PIER_LENGTH, PIER_END } from './pier.js';

// Preferred spot and facing for each building. Beach buildings sit between the
// boardwalk's beach leg and the water, facing +z toward the boardwalk; the
// clubhouse and bathroom sit in the open interior of the loop, facing the park leg.
const SCALE = 1.25; // chunky, readable from the opening camera
const PLAN = [
  { type: 'pier', build: buildPier, x: 42, z: -33, ry: 0 },
  { type: 'lifeguardTower', build: buildLifeguardTower, x: -2, z: -40, ry: 0 },
  { type: 'clubhouse', build: buildClubhouse, x: -36, z: 14, ry: 0.05 },
  { type: 'snackBar', build: buildSnackBar, x: -30, z: -33, ry: -0.06 },
  { type: 'surfShack', build: buildSurfShack, x: -62, z: -32, ry: 0.1 },
  { type: 'iceCream', build: buildIceCream, x: 14, z: -31, ry: -0.08 },
  { type: 'bikeRental', build: buildBikeRental, x: 68, z: -32, ry: -0.08 },
  { type: 'bathroom', build: buildBathroom, x: 36, z: 14, ry: -0.05 },
];

// Fallback offsets tried in order if the preferred spot is taken.
const OFFSETS = [[0, 0], [6, 0], [-6, 0], [0, 4], [12, 0], [-12, 0], [6, 4], [-6, 4], [18, 0], [-18, 0], [0, -4], [24, 0], [-24, 0]];

// Footprint circles in pier-local coordinates (origin at the shore end, running -z).
function pierFootprints() {
  const total = PIER_LENGTH + PIER_END;
  const end = { x: 0, z: -(total - 3.6), r: 3.6 };
  const list = [end];
  for (let d = 2.1; d <= -end.z - 3.6 - 2.1 + 1e-6; d += 4.3) list.push({ x: 0, z: -d, r: 2.1 });
  return list;
}

// Try to reserve all footprints of a building at (x, z) rotated by ry. Circles of a
// long building are reserved far end first so a failure never leaves a stray
// footprint on the land side.
function tryReserve(ctx, circles, x, z, ry) {
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const world = circles.map((c) => ({ x: x + c.x * cos + c.z * sin, z: z - c.x * sin + c.z * cos, r: c.r }));
  if (world.some((c) => !ctx.reserve(c.x, c.z, c.r))) return null;
  return world;
}

export function createBuildings(ctx) {
  const groups = [];
  for (const spec of PLAN) {
    const group = spec.build(palette);
    const circles = spec.type === 'pier' ? pierFootprints().sort((a, b) => a.z - b.z) : [{ x: 0, z: 0, r: group.userData.radius * SCALE + 0.3 }];
    let placed = null, px = spec.x, pz = spec.z;
    const candidates = OFFSETS.map(([dx, dz]) => [spec.x + dx, spec.z + dz]);
    // Last resort: sweep along x at the preferred depth.
    for (let x = -90; x <= 90; x += 6) candidates.push([x, spec.z]);
    for (const [x, z] of candidates) {
      if (spec.type === 'pier' && ctx.zone(x, z) !== 'sand') continue;
      placed = tryReserve(ctx, circles, x, z, spec.ry);
      if (placed) { px = x; pz = z; break; }
    }
    if (!placed) continue; // no room anywhere: skip rather than overlap
    group.position.set(px, spec.type === 'pier' ? 0 : ctx.heightAt(px, pz), pz);
    group.rotation.y = spec.ry;
    if (spec.type !== 'pier') group.scale.setScalar(SCALE);
    group.userData.type = spec.type;
    group.userData.footprint = placed;
    ctx.scene.add(group);
    groups.push(group);

    // Clubhouse flag waves gently.
    const flag = group.userData.flag;
    if (flag) ctx.addUpdater((dt, t) => { flag.rotation.y = Math.sin(t * 2.4) * 0.28; flag.rotation.z = Math.sin(t * 3.1) * 0.04; });
  }
  return groups;
}
