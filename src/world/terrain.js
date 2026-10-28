import * as THREE from 'three';
import { palette } from '../util/palette.js';
import { toon } from '../util/materials.js';
import { BOUNDS, PARK_Z } from '../util/layout.js';

export const WATER_LEVEL = 0;
const SHORE_Z = -52; // where sand meets the water line

const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Gentle ground: low rolling park, sand easing down to the shoreline, then
// sloping under the water.
export function heightAt(x, z) {
  const park = 0.38 + 0.12 * Math.sin(x * 0.045) * Math.cos(z * 0.06);
  const sand = 0.32 + 0.06 * Math.sin(x * 0.08 + z * 0.05);
  const land = sand + (park - sand) * smooth(PARK_Z - 6, PARK_Z + 6, z);
  const shore = smooth(SHORE_Z - 14, SHORE_Z + 22, z); // 0 under water, 1 inland
  return -0.45 + (land + 0.45) * shore;
}

function colorAt(x, z, h, out) {
  const grass = new THREE.Color(palette.grass).lerp(new THREE.Color(palette.grassDark), 0.5 + 0.5 * Math.sin(x * 0.11 + z * 0.07));
  const sand = new THREE.Color(palette.sand);
  const wet = new THREE.Color(palette.wetSand);
  out.copy(sand);
  out.lerp(grass, smooth(PARK_Z - 3, PARK_Z + 3, z));
  if (h < 0.18) out.lerp(wet, smooth(0.18, 0.02, h));
  return out;
}

export function createTerrain(ctx) {
  const size = BOUNDS * 2 + 100;
  const geo = new THREE.PlaneGeometry(size, size, 150, 150);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    colorAt(x, z, h, c);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, toon(0xffffff, { vertexColors: true }));
  ground.receiveShadow = true;
  ground.name = 'terrain';
  ctx.scene.add(ground);
  return ground;
}
