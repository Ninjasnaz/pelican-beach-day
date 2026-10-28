import * as THREE from 'three';
import { palette } from '../util/palette.js';
import { toon } from '../util/materials.js';
import { instanced } from '../util/instancing.js';

const SEGMENTS = 700; // ~0.6 m planks
const UP = new THREE.Vector3(0, 1, 0);

// Raised wooden deck that follows the track, on posts, with low rails.
export function createBoardwalk(ctx) {
  const { track } = ctx;
  const half = track.width / 2;
  const frames = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const u = i / SEGMENTS;
    const p = track.pointAt(u);
    const t = track.tangentAt(u);
    const side = new THREE.Vector3().crossVectors(t, UP).setY(0).normalize();
    frames.push({ p, side });
  }

  // Deck top + side skirts, each plank its own quad so colors alternate crisply.
  const pos = [], col = [];
  const light = new THREE.Color(palette.plank), dark = new THREE.Color(palette.plankDark), skirt = new THREE.Color(palette.post);
  const quad = (a, b, c, d, color) => {
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let k = 0; k < 6; k++) col.push(color.r, color.g, color.b);
  };
  const v = (f, s, dy = 0) => [f.p.x + f.side.x * s, f.p.y + dy, f.p.z + f.side.z * s];
  for (let i = 0; i < SEGMENTS; i++) {
    const f0 = frames[i], f1 = frames[i + 1];
    const c = i % 2 ? light : dark;
    quad(v(f0, -half), v(f1, -half), v(f1, half), v(f0, half), c);
    quad(v(f0, half), v(f1, half), v(f1, half, -0.3), v(f0, half, -0.3), skirt);
    quad(v(f0, -half, -0.3), v(f1, -half, -0.3), v(f1, -half), v(f0, -half), skirt);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const deck = new THREE.Mesh(geo, toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide }));
  deck.castShadow = deck.receiveShadow = true;
  deck.name = 'boardwalk';

  const group = new THREE.Group();
  group.add(deck);

  // Support posts every ~3.5 m on both sides.
  const posts = [];
  const postEvery = Math.round(SEGMENTS / (track.length / 3.5));
  for (let i = 0; i < SEGMENTS; i += postEvery) {
    for (const s of [-half + 0.25, half - 0.25]) {
      const [x, y, z] = v(frames[i], s);
      const g = ctx.heightAt(x, z);
      posts.push({ x, z, y: g, sx: 1, sy: Math.max(0.1, y - g), sz: 1 });
    }
  }
  const postGeo = new THREE.BoxGeometry(0.22, 1, 0.22).translate(0, 0.5, 0);
  group.add(instanced(postGeo, toon(palette.post), posts));

  // Low rails: balusters every ~2 m and a top rail on each side.
  const rails = [];
  const railEvery = Math.round(SEGMENTS / (track.length / 2));
  for (let i = 0; i < SEGMENTS; i += railEvery) {
    for (const s of [-half - 0.05, half + 0.05]) {
      const [x, y, z] = v(frames[i], s);
      rails.push({ x, y, z, sy: 0.75 });
    }
  }
  group.add(instanced(new THREE.BoxGeometry(0.1, 1, 0.1).translate(0, 0.5, 0), toon(palette.white), rails));
  for (const s of [-half - 0.05, half + 0.05]) {
    const pts = frames.slice(0, SEGMENTS).map((f) => new THREE.Vector3(...v(f, s, 0.75)));
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, SEGMENTS, 0.06, 5, true), toon(palette.white));
    tube.castShadow = true;
    group.add(tube);
  }

  ctx.scene.add(group);
  return group;
}
