import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon } from '../util/materials.js';
import { pick, range } from '../util/rng.js';

// Chunky low-poly people. Everything is flat vertex colors so a whole person is
// three merged geometries (body, head, right arm) and the crowd can merge many
// people into one mesh. Local frame: feet at the origin, facing +Z, left hand +X.

// Very light to very dark.
export const SKIN_TONES = [0xffe0c8, 0xf7d1b0, 0xeabf98, 0xdba67c, 0xc58c5f, 0xa8704a, 0x8a5636, 0x6b3f26, 0x4a2a1a, 0x3a2016];
export const OUTFIT_COLORS = [
  0xf25c54, 0xf7c948, 0x2ec4b6, 0x4aa3df, 0x2f5fa7, 0x8bc34a, 0xf28c28,
  0xff7eb6, 0x8e5ac8, 0xfdfdfd, 0x1f8a8a, 0xd7263d, 0x7fdbb6, 0x27406b,
];
const BOTTOM_COLORS = [0x4a6fa5, 0xc8b27a, 0x27406b, 0xfdfdfd, 0xf28c28, 0x1f8a8a, 0x333b4d, 0xf25c54, 0x8bc34a];
const HAIR = { black: 0x1f1a17, darkBrown: 0x3b2a20, brown: 0x6b4528, auburn: 0x8a3f22, red: 0xb5452a, blond: 0xe3c16f, platinum: 0xf1e2a8, gray: 0xc9c9c9, white: 0xf0f0f0 };
const HAT_COLORS = [0xf7c948, 0xfdfdfd, 0xd7263d, 0x2f5fa7, 0xf28c28, 0x2ec4b6];
const TOWEL_COLORS = [0xf25c54, 0x4aa3df, 0xf7c948, 0x2ec4b6, 0xff7eb6, 0x8e5ac8, 0x8bc34a, 0xf28c28];
const EYE = 0x2a1d1a, DARK = 0x2d2d2d, WOOD = 0x8a5a3b;

// ---- shared base geometries ------------------------------------------------
const baseCache = new Map();
const base = (key, make) => {
  if (!baseCache.has(key)) baseCache.set(key, make());
  return baseCache.get(key);
};
const box = () => base('box', () => new THREE.BoxGeometry(1, 1, 1));
const ball = () => base('ball', () => new THREE.SphereGeometry(0.5, 8, 6));
const rock = () => base('rock', () => new THREE.IcosahedronGeometry(0.5, 0));
const cyl = (rt, rb, seg = 8) => base(`cyl${rt}|${rb}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, 1, seg));

const _m = new THREE.Matrix4();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _q = new THREE.Quaternion();
// translate * rotate(x,y,z) * scale
const trs = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) =>
  new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));

// Bake geometry + color into a plain position/normal/color non-indexed piece.
function piece(geo, color, matrix) {
  const g = geo.clone().applyMatrix4(matrix);
  g.deleteAttribute('uv');
  const out = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(color);
  const n = out.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

const merge = (list) => mergeGeometries(list, false);

// ---- looks -----------------------------------------------------------------
function hairFor(rng, age, skinIdx) {
  if (age === 'senior' && rng() < 0.75) return rng() < 0.6 ? HAIR.gray : HAIR.white;
  if (skinIdx >= 6) return pick(rng, [HAIR.black, HAIR.black, HAIR.black, HAIR.darkBrown, HAIR.darkBrown, HAIR.brown]);
  if (skinIdx >= 3) return pick(rng, [HAIR.black, HAIR.darkBrown, HAIR.brown, HAIR.brown, HAIR.auburn, HAIR.blond]);
  return pick(rng, [HAIR.brown, HAIR.brown, HAIR.blond, HAIR.blond, HAIR.darkBrown, HAIR.red, HAIR.black, HAIR.auburn, HAIR.platinum]);
}

function outfitTypeFor(rng, age, pose, feminine, setting) {
  if (pose === 'lie') return feminine ? pick(rng, ['swimsuit', 'bikini']) : 'trunks';
  const swim = setting === 'beach' && rng() < 0.55;
  if (age === 'senior') return pick(rng, ['longpants', 'longpants', 'tshirt', feminine ? 'sundress' : 'longpants']);
  if (age === 'kid') {
    if (swim) return feminine ? 'swimsuit' : 'trunks';
    return pick(rng, feminine ? ['sundress', 'tshirt'] : ['tshirt', 'tshirt']);
  }
  if (swim) return feminine ? pick(rng, ['swimsuit', 'bikini']) : 'trunks';
  return feminine ? pick(rng, ['sundress', 'tshirt', 'tshirt', 'longpants']) : pick(rng, ['tshirt', 'tshirt', 'longpants']);
}

function chooseLook(rng, age, pose, over = {}) {
  const feminine = over.feminine ?? rng() < 0.5;
  const skinTone = over.skinTone ?? pick(rng, SKIN_TONES);
  const skinIdx = Math.max(0, SKIN_TONES.indexOf(skinTone));
  const hairStyle = over.hairStyle ?? (age === 'kid'
    ? pick(rng, ['short', 'ponytail', 'curly', 'bun', 'short'])
    : feminine ? pick(rng, ['long', 'long', 'bun', 'ponytail', 'short', 'curly'])
      : pick(rng, ['short', 'short', 'short', 'bald', 'curly', 'long']));
  const outfitType = over.outfitType ?? outfitTypeFor(rng, age, pose, feminine, over.setting ?? 'beach');
  const top = over.top ?? pick(rng, OUTFIT_COLORS);
  const sameSuit = outfitType === 'swimsuit' || outfitType === 'trunks' || outfitType === 'sundress' || (outfitType === 'bikini' && rng() < 0.5);
  const bottom = over.bottom ?? (sameSuit ? top : pick(rng, BOTTOM_COLORS));
  const hatChance = pose === 'lie' ? 0.15 : 0.3;
  const hat = over.hat !== undefined ? over.hat : rng() < hatChance ? { style: rng() < 0.5 ? 'sun' : 'cap', color: pick(rng, HAT_COLORS) } : null;
  const sunglasses = over.sunglasses ?? rng() < 0.3;
  return {
    age, pose, feminine, skinTone, hairStyle,
    hair: over.hair ?? hairFor(rng, age, skinIdx),
    outfitType, outfit: top, top, bottom, hat, sunglasses,
    build: over.build ?? range(rng, 0.9, 1.25),
    tall: over.tall ?? range(rng, 0.94, 1.07),
    cane: over.cane ?? (age === 'senior' && pose === 'stand' && rng() < 0.45),
    barefoot: over.barefoot ?? rng() < 0.6,
    towelColor: over.towelColor ?? pick(rng, TOWEL_COLORS),
    towelStripe: over.towelStripe ?? pick(rng, TOWEL_COLORS),
  };
}

// ---- geometry --------------------------------------------------------------
// Returns { body, head, armR, headPivot, armPivot, look }: three merged
// BufferGeometries (position, normal, color) in the person's local frame, plus
// the neck and right-shoulder points they should rotate around.
export function buildPerson(rng, { age = 'adult', pose = 'stand', look: over } = {}) {
  const look = chooseLook(rng, age, pose, over);
  const kid = age === 'kid', senior = age === 'senior';
  const scale = kid ? range(rng, 0.55, 0.65) : look.tall * (senior ? 0.97 : 1);
  const hs = kid ? 1.18 : 1; // kids get proportionally bigger heads
  const W = look.build;
  const skin = look.skinTone;

  const sit = pose === 'sit';
  const hipY = sit ? 0.1 : 0.78;
  const torsoH = 0.6;
  const torsoTop = hipY + torsoH;
  const torsoW = 0.44 * W, torsoD = 0.28 * Math.min(W, 1.1);
  const legW = 0.17 * (0.8 + 0.2 * W);
  const armW = 0.13 * (0.8 + 0.2 * W);
  const hipX = torsoW * 0.26;
  const shoulderX = torsoW / 2 + armW / 2 - 0.01;
  const headR = 0.21 * hs;
  const headY = torsoTop + 0.17 * hs;
  const stoop = senior && pose === 'stand' ? 0.22 : 0;

  // Upper body leans forward about the hips (seniors).
  const upper = trs(0, hipY, 0, 1, 1, 1, stoop).multiply(trs(0, -hipY, 0));
  const root = new THREE.Matrix4().makeScale(scale, scale, scale);
  const parts = { body: [], head: [], arm: [] };
  const add = (group, geo, color, local, isUpper = true) => {
    const m = root.clone();
    if (isUpper && group !== 'lowerOnly') m.multiply(upper);
    parts[group === 'lowerOnly' ? 'body' : group].push(piece(geo, color, m.multiply(local)));
  };
  const addLower = (geo, color, local) => add('lowerOnly', geo, color, local, false);

  // A limb hangs from (x, y, z) along local -Y; rot tilts it about X (or Z).
  // segs = [[fraction, color], ...] from the top down.
  const limb = (group, isUpper, x, y, z, w, d, len, segs, rx = 0, rz = 0, foot = null) => {
    const top = trs(x, y, z, 1, 1, 1, rx, 0, rz);
    let at = 0;
    for (const [frac, color] of segs) {
      const l = len * frac;
      add(group, box(), color, top.clone().multiply(trs(0, -(at + l / 2), 0, w, l, d)), isUpper);
      at += l;
    }
    if (foot) add(group, box(), foot, top.clone().multiply(trs(0, -len + 0.04, 0.06, w * 1.05, 0.08, 0.27)), isUpper);
  };

  const type = look.outfitType;
  const { top, bottom } = look;
  const shirty = type === 'tshirt' || type === 'longpants';
  const torsoColor = shirty || type === 'swimsuit' || type === 'sundress' ? top : skin;

  // ---- torso
  add('body', cyl(0.5, 0.44), torsoColor, trs(0, hipY + torsoH / 2 - 0.02, 0, torsoW, torsoH, torsoD));
  if (type === 'bikini') add('body', cyl(0.52, 0.52), top, trs(0, torsoTop - 0.17, 0, torsoW * 0.97, 0.13, torsoD * 1.02));
  if (type === 'swimsuit' || type === 'sundress') add('body', cyl(0.5, 0.5), skin, trs(0, torsoTop - 0.02, 0, torsoW * 0.8, 0.05, torsoD * 0.8)); // neckline
  if (type === 'sundress') add('body', cyl(0.44, 0.7, 10), top, trs(0, hipY - 0.16, 0, torsoW * 0.98, 0.5, torsoD * 1.25), false);

  // ---- legs
  const legLen = sit ? 0.8 : 0.78;
  const legTilt = sit ? -(Math.PI / 2 - 0.15) : 0;
  const thigh = type === 'tshirt' || type === 'trunks' ? 0.45 : type === 'swimsuit' || type === 'bikini' ? 0.13 : 0;
  const legSegs = type === 'longpants' ? [[1, bottom]] : thigh ? [[thigh, bottom], [1 - thigh, skin]] : [[1, skin]];
  const shoe = look.barefoot && type !== 'longpants' ? skin : type === 'longpants' ? DARK : pick(rng, OUTFIT_COLORS);
  for (const sx of [1, -1]) limb('body', false, sx * hipX, hipY + (sit ? 0 : 0.02), 0, legW, legW * 1.1, legLen, legSegs, legTilt, 0, shoe);

  // ---- arms (left is part of the body; right is its own mesh)
  const sleeve = shirty ? 0.4 : type === 'sundress' ? 0.12 : 0;
  const armSegs = sleeve ? [[sleeve, top], [1 - sleeve, skin]] : [[1, skin]];
  const armLen = 0.6;
  const shoulderY = torsoTop - 0.08;
  const leftTilt = sit ? -0.9 : senior && look.cane ? -0.45 : 0;
  limb('body', true, shoulderX, shoulderY, 0, armW, armW * 1.1, armLen, armSegs, leftTilt, 0.07);
  limb('arm', true, -shoulderX, shoulderY, 0, armW, armW * 1.1, armLen, armSegs, 0, -0.07);

  // ---- cane (seniors): rests on the ground by the left hand
  if (look.cane) {
    addLower(box(), WOOD, trs(shoulderX + 0.08, 0.42, 0.28, 0.035, 0.84, 0.035));
    addLower(box(), WOOD, trs(shoulderX + 0.08, 0.86, 0.24, 0.035, 0.035, 0.12));
  }

  // ---- head: face, hair, hat, sunglasses
  add('head', ball(), skin, trs(0, headY, 0, headR * 2, headR * 2, headR * 2));
  const hr = headR / 0.21; // hair and hats scale with the head
  const H = (y) => headY + y * hr;
  const hairBox = (x, y, z, w, h, d, rx = 0) => add('head', box(), look.hair, trs(x * hr, H(y), z * hr, w * hr, h * hr, d * hr, rx));
  const hairBall = (x, y, z, dia, sy = 1) => add('head', ball(), look.hair, trs(x * hr, H(y), z * hr, dia * hr, dia * sy * hr, dia * hr));
  const clump = (x, y, z, dia) => add('head', rock(), look.hair, trs(x * hr, H(y), z * hr, dia * hr, dia * hr, dia * hr));
  switch (look.hairStyle) {
    case 'short': hairBall(0, 0.05, -0.02, 0.46, 0.82); break;
    case 'long': hairBall(0, 0.05, -0.02, 0.46, 0.82); hairBox(0, -0.14, -0.14, 0.4, 0.5, 0.12); break;
    case 'bun': hairBall(0, 0.05, -0.02, 0.46, 0.82); hairBall(0, 0.24, -0.09, 0.17); break;
    case 'ponytail': hairBall(0, 0.05, -0.02, 0.46, 0.82); hairBox(0, -0.07, -0.25, 0.07, 0.3, 0.08, 0.25); break;
    case 'curly':
      hairBall(0, 0.04, -0.03, 0.44, 0.8);
      for (const [x, y, z] of [[0, 0.2, 0], [0.14, 0.15, 0], [-0.14, 0.15, 0], [0, 0.14, -0.14], [0.17, 0.03, -0.08], [-0.17, 0.03, -0.08], [0, 0.0, -0.19]]) clump(x, y, z, 0.22);
      break;
    default: break; // bald
  }
  if (look.hat?.style === 'sun') {
    add('head', cyl(0.5, 0.5, 10), look.hat.color, trs(0, H(0.17), 0, 0.68 * hr, 0.03 * hr, 0.68 * hr));
    add('head', cyl(0.5, 0.55, 10), look.hat.color, trs(0, H(0.24), 0, 0.32 * hr, 0.14 * hr, 0.32 * hr));
  } else if (look.hat?.style === 'cap') {
    add('head', ball(), look.hat.color, trs(0, H(0.09), -0.01 * hr, 0.46 * hr, 0.3 * hr, 0.46 * hr));
    add('head', box(), look.hat.color, trs(0, H(0.09), 0.24 * hr, 0.26 * hr, 0.03 * hr, 0.18 * hr));
  }
  if (look.sunglasses) {
    add('head', box(), DARK, trs(0, H(0.02), 0.185 * hr, 0.36 * hr, 0.08 * hr, 0.07 * hr));
  } else {
    for (const sx of [1, -1]) add('head', box(), EYE, trs(sx * 0.075 * hr, H(0.02), 0.195 * hr, 0.045 * hr, 0.06 * hr, 0.03 * hr));
  }

  // ---- towel (lying people always, some sitters)
  const towel = pose === 'lie' || (sit && rng() < 0.5);
  const towelPieces = [];
  if (towel) {
    const len = pose === 'lie' ? 1.75 * scale + 0.5 : 1.2, wid = Math.max(scale, 0.7) * 1.0;
    const cz = pose === 'lie' ? 0 : 0.25;
    towelPieces.push([box(), look.towelColor, trs(0, 0.015, cz, wid, 0.03, len)]);
    for (const dz of [-1, 1]) towelPieces.push([box(), look.towelStripe, trs(0, 0.017, cz + dz * (len / 2 - 0.12), wid * 1.002, 0.03, 0.09)]);
  }

  // Pivots (neck, right shoulder) through the same transforms as the parts.
  const through = (x, y, z) => _v.set(x, y, z).applyMatrix4(upper).applyMatrix4(root).clone();
  const headPivot = through(0, torsoTop - 0.02, 0);
  const armPivot = through(-shoulderX, shoulderY, 0);

  let body = merge(parts.body), head = merge(parts.head), armR = merge(parts.arm);
  const tow = towelPieces.map(([g, c, m]) => piece(g, c, m));
  if (pose === 'lie') {
    // Lay the standing figure on its back, head toward -Z, centered on the towel.
    const lay = trs(0, 0, 0, 1, 1, 1, -Math.PI / 2);
    for (const g of [body, head, armR]) g.applyMatrix4(lay);
    headPivot.applyMatrix4(lay);
    armPivot.applyMatrix4(lay);
    const bb = new THREE.Box3().setFromBufferAttribute(body.attributes.position).union(new THREE.Box3().setFromBufferAttribute(head.attributes.position));
    const shift = trs(0, 0.035 - bb.min.y, -(bb.min.z + bb.max.z) / 2);
    for (const g of [body, head, armR]) g.applyMatrix4(shift);
    headPivot.applyMatrix4(shift);
    armPivot.applyMatrix4(shift);
  }
  if (tow.length) body = merge([body, ...tow]);
  return { body, head, armR, headPivot, armPivot, look };
}

// ---- real scene-graph person (vendors, anything that wants a plain Group) ---
const bodyMaterial = () => toon(0xffffff, { vertexColors: true });

export function createPerson(rng, opts = {}) {
  const { body, head, armR, headPivot, armPivot, look } = buildPerson(rng, opts);
  const group = new THREE.Group();
  const bodyMesh = new THREE.Mesh(body, bodyMaterial());
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  const part = (geo, pivot) => {
    const g = geo.clone().translate(-pivot.x, -pivot.y, -pivot.z);
    const m = new THREE.Mesh(g, bodyMaterial());
    m.position.copy(pivot);
    m.receiveShadow = true;
    return m;
  };
  const headMesh = part(head, headPivot);
  const armMesh = part(armR, armPivot);
  group.add(bodyMesh, headMesh, armMesh);
  group.userData.look = look;
  return {
    group,
    parts: { torso: bodyMesh, head: headMesh, armL: bodyMesh, armR: armMesh, legL: bodyMesh, legR: bodyMesh },
    look,
  };
}
