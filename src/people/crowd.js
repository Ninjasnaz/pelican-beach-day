import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon } from '../util/materials.js';
import { pick, range } from '../util/rng.js';
import { buildPerson, SKIN_TONES, OUTFIT_COLORS } from './person.js';
import { createIdle, idlePose } from './idle.js';

// The whole crowd is ONE mesh (2 draw calls with its shadow pass). Every person
// is baked into a shared vertex-colored geometry in their own local frame, and
// a small vertex-shader hook places, turns, tilts the head of and raises the
// right arm of each person from a per-person data texture that the updater
// refreshes once per frame. people[i].group is an empty Group that mirrors the
// person's current world position and yaw (handy for tests, cameras, queues).

const DEG = Math.PI / 180;
const MIN_H = 0.16; // keep feet above the lapping water line

// ---- shader hook ----------------------------------------------------------
const ANIM_GLSL = /* glsl */ `
attribute float aPerson;
attribute vec4 aPivot; // xyz = pivot, w = part (0 body, 1 head, 2 right arm)
uniform sampler2D uCrowd;
void crowdAnim(inout vec3 p, inout vec3 n) {
  int id = int(aPerson + 0.5);
  vec4 a = texelFetch(uCrowd, ivec2(id, 0), 0); // world xyz, yaw
  vec4 b = texelFetch(uCrowd, ivec2(id, 1), 0); // head pitch (rad), arm angle (rad)
  if (aPivot.w > 0.5) {
    vec3 r = p - aPivot.xyz;
    if (aPivot.w < 1.5) {
      float c = cos(-b.x), s = sin(-b.x);
      r = vec3(r.x, r.y * c - r.z * s, r.y * s + r.z * c);
      n = vec3(n.x, n.y * c - n.z * s, n.y * s + n.z * c);
    } else {
      float c = cos(-b.y), s = sin(-b.y);
      r = vec3(r.x * c - r.y * s, r.x * s + r.y * c, r.z);
      n = vec3(n.x * c - n.y * s, n.x * s + n.y * c, n.z);
    }
    p = r + aPivot.xyz;
  }
  float cy = cos(a.w), sy = sin(a.w);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy) + a.xyz;
  n = vec3(n.x * cy + n.z * sy, n.y, -n.x * sy + n.z * cy);
}
`;

function hook(material, uniform, key, withNormal) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCrowd = uniform;
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', `${ANIM_GLSL}\nvoid main() {`)
      .replace(
        withNormal ? '#include <beginnormal_vertex>' : '#include <begin_vertex>',
        withNormal
          ? '#include <beginnormal_vertex>\nvec3 cPos = position;\ncrowdAnim(cPos, objectNormal);'
          : 'vec3 cPos = position;\nvec3 cNrm = vec3(0.0, 1.0, 0.0);\ncrowdAnim(cPos, cNrm);\nvec3 transformed = cPos;',
      );
    if (withNormal) shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = cPos;');
  };
  material.customProgramCacheKey = () => key;
}

// Shuffled deck that refills when empty: guarantees variety in small crowds.
function deck(rng, items) {
  let pile = [];
  return () => {
    if (!pile.length) {
      pile = items.slice();
      for (let i = pile.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pile[i], pile[j]] = [pile[j], pile[i]];
      }
    }
    return pile.pop();
  };
}

export function createCrowd(ctx, count = 60, { queueSpots = [] } = {}) {
  const { rng, heightAt, zone, scene } = ctx;
  const people = [];
  const records = [];
  if (count <= 0) return { people };

  const nextSkin = deck(rng, SKIN_TONES);
  const nextTop = deck(rng, OUTFIT_COLORS);
  const ages = [];
  const kids = Math.round(count * 0.2), seniors = Math.max(count >= 3 ? 1 : 0, Math.round(count * 0.14));
  for (let i = 0; i < count; i++) ages.push(i < kids ? 'kid' : i < kids + seniors ? 'senior' : 'adult');
  if (count >= 3) { ages[0] = 'kid'; ages[1] = 'senior'; ages[2] = 'adult'; }
  for (let i = ages.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ages[i], ages[j]] = [ages[j], ages[i]];
  }

  // ---- placement helpers
  const usable = (x, z) =>
    zone(x, z) !== 'water' && heightAt(x, z) > MIN_H && !(Math.abs(x) < 9 && z > 43); // keep the opening view clear
  function spot(r, sample, tries = 80) {
    for (let i = 0; i < tries; i++) {
      const [x, z] = sample();
      if (usable(x, z) && ctx.reserve(x, z, r)) return { x, z };
    }
    return null;
  }
  const beach = () => [range(rng, -105, 105), range(rng, -36, -26)];
  const dry = () => [range(rng, -105, 105), range(rng, -34, -27)]; // above the wave wash
  const interior = () => [range(rng, -65, 65), range(rng, -6, 24)];
  const fore = () => [(rng() < 0.5 ? -1 : 1) * range(rng, 10, 27), range(rng, 44, 64)]; // opening camera's foreground, beside the clear lane
  const park = () => [range(rng, -125, 125), range(rng, 12, 78)];
  const edge = () => {
    const x = range(rng, -90, 90);
    let z = -52;
    while (z < -30 && heightAt(x, z) < MIN_H + 0.04) z += 0.25;
    return [x, z + range(rng, 0, 1)];
  };
  const SEA = Math.PI; // yaw that faces -Z

  function make(kind, pose, setting, x, z, yaw) {
    if (records.length >= count) return null;
    const age = ages[records.length] ?? 'adult';
    const g = buildPerson(rng, { age, pose, look: { skinTone: nextSkin(), top: nextTop(), setting } });
    const idle = createIdle(rng, pose === 'stand' ? kind : 'sitter');
    const lift = pose === 'lie' ? 0.03 : 0;
    const group = new THREE.Group();
    group.position.set(x, heightAt(x, z) + lift, z);
    group.rotation.y = yaw;
    group.name = `person-${pose}`;
    group.userData.look = g.look;
    const rec = { g, idle, pose, base: group.position.clone(), yaw, group, id: records.length };
    records.push(rec);
    people.push({ group, idle, kind: idle.kind, age, look: g.look, pose });
    return rec;
  }
  const left = (n) => count - records.length - n; // slots remaining after n more
  const standKind = () => pick(rng, ['looker', 'looker', 'waver', 'waver', 'pacer']);
  const groupKind = () => pick(rng, ['looker', 'looker', 'waver']);

  // ---- queue (vendor lines)
  const nq = queueSpots.length ? Math.min(queueSpots.length, Math.max(3, Math.round(count * 0.1)), count) : 0;
  for (let i = 0; i < nq; i++) {
    const s = queueSpots[i];
    make(i === 0 ? 'waver' : pick(rng, ['looker', 'looker', 'waver']), 'stand', 'beach', s.x, s.z, s.facing ?? SEA);
  }

  const rest = count - nq;
  const quota = {
    lie: Math.round(rest * 0.17),
    sit: Math.round(rest * 0.09),
    edge: Math.round(rest * 0.06),
    beachGroup: Math.round(rest * 0.22),
    interior: Math.round(rest * 0.12),
    fore: Math.round(rest * 0.22),
  };

  // Sunbathers on towels between the boardwalk and the water; pairs share a yaw.
  let lying = 0;
  while (lying < quota.lie && left(0) > 0) {
    const pair = quota.lie - lying >= 2 && rng() < 0.4;
    const yaw = rng() < 0.5 ? Math.PI + range(rng, -0.35, 0.35) : pick(rng, [-1, 1]) * Math.PI / 2 + range(rng, -0.3, 0.3);
    const s = spot(pair ? 2.1 : 1.3, dry);
    if (!s) break;
    const ax = Math.cos(yaw), az = -Math.sin(yaw);
    const offs = pair ? [-0.65, 0.65] : [0];
    for (const o of offs) { make('sitter', 'lie', 'beach', s.x + ax * o, s.z + az * o, yaw); lying++; }
  }

  // Sitters on sand and grass.
  for (let i = 0; i < quota.sit && left(0) > 0; i++) {
    const where = rng() < 0.65 ? beach : park;
    const s = spot(1.0, where);
    if (s) make('sitter', 'sit', where === beach ? 'beach' : 'park', s.x, s.z, where === beach ? SEA + range(rng, -0.6, 0.6) : range(rng, 0, 6.28));
  }

  // A few at the water's edge, looking at the sea.
  for (let i = 0; i < quota.edge && left(0) > 0; i++) {
    const s = spot(0.7, edge, 120);
    if (s) make(groupKind(), 'stand', 'beach', s.x, s.z, SEA + range(rng, -0.4, 0.4));
  }

  // Standing groups: chatting circles and watchers lined up facing the sea.
  function standGroup(n, where, setting, faceSea) {
    const ring = 0.45 + 0.12 * n;
    const s = spot(ring + 0.55, where);
    if (!s) return 0;
    const a0 = rng() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const a = a0 + (k / n) * Math.PI * 2;
      const x = s.x + Math.cos(a) * ring, z = s.z + Math.sin(a) * ring;
      const yaw = faceSea ? SEA + range(rng, -0.5, 0.5) : Math.atan2(s.x - x, s.z - z) + range(rng, -0.25, 0.25);
      make(groupKind(), 'stand', setting, x, z, yaw);
    }
    return n;
  }
  let grouped = 0;
  while (grouped < quota.beachGroup && left(0) > 0) {
    const n = Math.min(pick(rng, [2, 3, 3, 4]), quota.beachGroup - grouped, left(0));
    const made = n === 1 ? 0 : standGroup(n, beach, 'beach', rng() < 0.3);
    if (!made) {
      // Single leftover: solo beach stander.
      const s = spot(0.7, beach);
      if (!s) break;
      make(groupKind(), 'stand', 'beach', s.x, s.z, SEA + range(rng, -0.6, 0.6));
      grouped++;
    } else grouped += made;
  }

  // Inside the loop: solo pacers and small groups.
  let inner = 0;
  while (inner < quota.interior && left(0) > 0) {
    if (rng() < 0.4 && quota.interior - inner >= 2) {
      inner += standGroup(2, interior, 'park', false);
      if (!inner) break;
    } else {
      const solo = standKind();
      const s = spot(solo === 'pacer' ? 1.7 : 0.7, interior);
      if (!s) break;
      make(solo, 'stand', 'park', s.x, s.z, solo === 'pacer' ? SEA : range(rng, 0, 6.28));
      inner++;
    }
  }

  // Foreground park life (what the opening view sees): small groups, strollers, a sitter or two.
  let near = 0;
  while (near < quota.fore && left(0) > 0) {
    const r = rng();
    if (r < 0.35 && quota.fore - near >= 2) {
      near += standGroup(Math.min(pick(rng, [2, 3]), quota.fore - near, left(0)), fore, 'park', false);
    } else if (r < 0.5) {
      const s = spot(1.0, fore);
      if (!s) break;
      make('sitter', 'sit', 'park', s.x, s.z, range(rng, 0, 6.28));
      near++;
    } else {
      const solo = standKind();
      const s = spot(solo === 'pacer' ? 1.7 : 0.7, fore);
      if (!s) break;
      make(solo, 'stand', 'park', s.x, s.z, solo === 'pacer' ? SEA : range(rng, 0, 6.28));
      near++;
    }
  }

  // Everyone else strolls about in the park (and on the beach if the park is full).
  let guard = 0;
  while (records.length < count && guard++ < count * 40) {
    const where = guard % 5 === 0 ? beach : park;
    const solo = standKind();
    const pacer = solo === 'pacer';
    if (!pacer && left(0) >= 2 && rng() < 0.3) { standGroup(Math.min(2, left(0)), where, where === beach ? 'beach' : 'park', false); continue; }
    const s = spot(pacer ? 1.7 : 0.7, where);
    if (s) make(solo, 'stand', where === beach ? 'beach' : 'park', s.x, s.z, pacer ? SEA : range(rng, 0, 6.28));
  }
  // Some positions can come up short on a cramped map: drop surplus ages, nothing else.
  people.length = records.length;

  // ---- bake one mesh -------------------------------------------------------
  const n = records.length;
  const geos = [];
  for (const r of records) {
    const parts = [[r.g.body, 0, null], [r.g.head, 1, r.g.headPivot], [r.g.armR, 2, r.g.armPivot]];
    for (const [geo, part, pivot] of parts) {
      const g = geo.clone();
      const v = g.attributes.position.count;
      g.setAttribute('aPerson', new THREE.BufferAttribute(new Float32Array(v).fill(r.id), 1));
      const pv = new Float32Array(v * 4);
      for (let i = 0; i < v; i++) pv.set([pivot?.x ?? 0, pivot?.y ?? 0, pivot?.z ?? 0, part], i * 4);
      g.setAttribute('aPivot', new THREE.BufferAttribute(pv, 4));
      geos.push(g);
    }
  }
  const geometry = mergeGeometries(geos, false);
  for (const r of records) { r.g.body.dispose(); r.g.head.dispose(); r.g.armR.dispose(); }

  const data = new Float32Array(n * 8); // row 0: x y z yaw; row 1: pitch armAngle
  const texture = new THREE.DataTexture(data, n, 2, THREE.RGBAFormat, THREE.FloatType);
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  const uniform = { value: texture };

  const material = toon(0xffffff, { vertexColors: true, name: 'crowd' }).clone();
  hook(material, uniform, 'crowd-toon', true);
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  hook(depth, uniform, 'crowd-depth', false);

  const crowd = new THREE.Mesh(geometry, material);
  crowd.name = 'crowd';
  crowd.castShadow = true;
  crowd.receiveShadow = true;
  crowd.customDepthMaterial = depth;
  crowd.frustumCulled = false; // positions live in the shader, not the geometry
  const root = new THREE.Group();
  root.name = 'crowd-root';
  root.add(crowd);
  for (const p of people) root.add(p.group);
  scene.add(root);

  function apply(t) {
    for (const r of records) {
      const i = r.id;
      let x = r.base.x, z = r.base.z, yaw = r.yaw, pitch = 0, arm = 0;
      if (r.pose !== 'lie') {
        const p = idlePose(r.idle, t);
        x += p.offsetX * Math.cos(r.yaw);
        z -= p.offsetX * Math.sin(r.yaw);
        yaw += p.yaw;
        pitch = p.headPitch * DEG;
        arm = p.armRaise * (2.5 + 0.35 * Math.sin(t * 9 + r.idle.phase));
        r.group.position.set(x, r.base.y, z);
        r.group.rotation.y = yaw;
      }
      data.set([x, r.base.y, z, yaw], i * 4);
      data.set([pitch, arm, 0, 0], (n + i) * 4);
    }
    texture.needsUpdate = true;
  }
  apply(0);
  ctx.addUpdater((dt, t) => apply(t));

  return { people, mesh: crowd };
}
