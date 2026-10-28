import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { mulberry32, SEED } from '../src/util/rng.js';
import { palette } from '../src/util/palette.js';
import { createTrack } from '../src/track/trackPath.js';
import { createLayout } from '../src/util/layout.js';
import { heightAt } from '../src/world/terrain.js';
import { createCart } from '../src/vendors/cart.js';
import { createVendors } from '../src/vendors/index.js';
import { createProps } from '../src/props/index.js';

const TYPES = ['iceCream', 'hotDog', 'lemonade', 'cottonCandy', 'taco'];

function makeCtx() {
  const track = createTrack();
  const layout = createLayout(track);
  const updaters = [];
  const accepted = [];
  const reserve = (x, z, r) => {
    const ok = layout.reserve(x, z, r);
    if (ok) accepted.push({ x, z, r });
    return ok;
  };
  return {
    scene: new THREE.Scene(),
    rng: mulberry32(SEED),
    heightAt,
    zone: layout.zone,
    track,
    reserve,
    addUpdater: (fn) => updaters.push(fn),
    updaters,
    accepted,
  };
}

function stats(root) {
  let meshes = 0, tris = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const g = o.geometry;
    const n = g.index ? g.index.count : g.attributes.position.count;
    tris += (n / 3) * (o.isInstancedMesh ? o.count : 1);
  });
  return { meshes, tris };
}

describe('createCart', () => {
  it.each(TYPES)('builds a %s cart with a striped umbrella', (type) => {
    const cart = createCart(type, palette);
    expect(cart).toBeInstanceOf(THREE.Group);
    expect(cart.userData.type).toBe(type);
    expect(cart.children.some((c) => c.userData.umbrella === true)).toBe(true);
    expect([2, 4]).toContain(cart.userData.wheels);
  });
  it('merges static parts: few meshes per cart', () => {
    for (const type of TYPES) expect(stats(createCart(type, palette)).meshes).toBeLessThanOrEqual(2);
  });
});

describe('createVendors', () => {
  const ctx = makeCtx();
  const res = createVendors(ctx);

  it('places 5 carts, one of each type', () => {
    expect(res.carts).toHaveLength(5);
    expect(new Set(res.carts.map((c) => c.userData.type))).toEqual(new Set(TYPES));
    for (const c of res.carts) {
      expect(c.children.some((k) => k.userData.umbrella === true)).toBe(true);
      expect(ctx.scene.getObjectById(c.id)).toBeTruthy();
    }
  });
  it('keeps every cart beside the boardwalk, on the ground, in a spot reserve() accepted', () => {
    for (const c of res.carts) {
      const d = ctx.track.distanceTo(c.position.x, c.position.z);
      expect(d).toBeLessThanOrEqual(12);
      expect(d).toBeGreaterThanOrEqual(ctx.track.width / 2 + 3);
      expect(ctx.accepted.some((a) => Math.hypot(a.x - c.position.x, a.z - c.position.z) < 0.01)).toBe(true);
      expect(c.position.y).toBeCloseTo(heightAt(c.position.x, c.position.z), 3);
    }
  });
  it('spreads carts at least 4 m apart, on both legs, out of the opening corridor', () => {
    for (let i = 0; i < 5; i++) {
      for (let j = i + 1; j < 5; j++) {
        expect(Math.hypot(res.carts[i].position.x - res.carts[j].position.x, res.carts[i].position.z - res.carts[j].position.z)).toBeGreaterThanOrEqual(4);
      }
    }
    expect(res.carts.some((c) => c.position.z < 0)).toBe(true);
    expect(res.carts.some((c) => c.position.z > 15)).toBe(true);
    for (const c of res.carts) {
      const { x, z } = c.position;
      expect(Math.abs(x) < 8 && z > 45 && z < 90).toBe(false);
    }
  });
  it('gives each cart a vendor with a head, standing behind the counter', () => {
    expect(res.vendors).toHaveLength(5);
    res.vendors.forEach((v, i) => {
      expect(v.getObjectByName('head')).toBeTruthy();
      expect(ctx.scene.getObjectById(v.id)).toBeTruthy();
      expect(Math.hypot(v.position.x - res.carts[i].position.x, v.position.z - res.carts[i].position.z)).toBeLessThan(2);
    });
  });
  it('offers queue spots in front of carts, never in water, facing the cart', () => {
    expect(res.queueSpots.length).toBeGreaterThanOrEqual(5);
    for (const s of res.queueSpots) {
      expect(ctx.zone(s.x, s.z)).not.toBe('water');
      expect(Number.isFinite(s.facing)).toBe(true);
      const near = res.carts.reduce((b, c) => (Math.hypot(c.position.x - s.x, c.position.z - s.z) < Math.hypot(b.position.x - s.x, b.position.z - s.z) ? c : b));
      const dx = near.position.x - s.x, dz = near.position.z - s.z;
      const len = Math.hypot(dx, dz);
      expect(len).toBeLessThan(6);
      expect((Math.sin(s.facing) * dx + Math.cos(s.facing) * dz) / len).toBeGreaterThan(0.9);
    }
    for (const c of res.carts) {
      const n = res.queueSpots.filter((s) => Math.hypot(c.position.x - s.x, c.position.z - s.z) < 6).length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
    }
  });
  it('animates vendors with independent phases', () => {
    expect(ctx.updaters.length).toBeGreaterThanOrEqual(1);
    const sample = (t) => {
      ctx.updaters.forEach((fn) => fn(0.016, t));
      return res.vendors.map((v) => v.rotation.z + v.rotation.x);
    };
    const a = sample(3.1);
    const b = sample(3.1);
    expect(b).toEqual(a);
    expect(new Set(a.map((n) => n.toFixed(5))).size).toBeGreaterThanOrEqual(4);
    let moved = false, leaned = false;
    for (let t = 0; t < 60; t += 0.25) {
      const cur = sample(t);
      if (cur.some((n, i) => Math.abs(n - a[i]) > 0.01)) moved = true;
      if (res.vendors.some((v) => v.rotation.x > 0.15)) leaned = true;
      cur.forEach((n) => expect(Number.isFinite(n)).toBe(true));
    }
    expect(moved).toBe(true);
    expect(leaned).toBe(true);
  });
  it('is deterministic for a given seed', () => {
    const again = createVendors(makeCtx());
    expect(again.carts.map((c) => [c.userData.type, c.position.x, c.position.z])).toEqual(res.carts.map((c) => [c.userData.type, c.position.x, c.position.z]));
  });
});

describe('createProps', () => {
  const ctx = makeCtx();
  const props = createProps(ctx);
  const canopy = props.getObjectByName('umbrellaCanopy');
  const m = new THREE.Matrix4();
  const spots = Array.from({ length: canopy.count }, (_, i) => {
    canopy.getMatrixAt(i, m);
    return new THREE.Vector3().setFromMatrixPosition(m);
  });

  it('adds a group to the scene', () => {
    expect(props).toBeInstanceOf(THREE.Group);
    expect(ctx.scene.children).toContain(props);
  });
  it('has at least 15 striped umbrellas, none in the water, mostly on the sand', () => {
    expect(canopy.isInstancedMesh).toBe(true);
    expect(props.getObjectByName('umbrellaCanopyWhite').count).toBe(canopy.count);
    expect(canopy.count).toBeGreaterThanOrEqual(15);
    for (const p of spots) {
      expect(ctx.zone(p.x, p.z)).not.toBe('water');
      expect(ctx.track.distanceTo(p.x, p.z)).toBeGreaterThan(ctx.track.width / 2);
    }
    expect(spots.filter((p) => p.z <= -25 && p.z >= -48).length / spots.length).toBeGreaterThan(0.8);
  });
  it('puts towels under umbrellas and varies umbrella colors', () => {
    expect(props.getObjectByName('towels').count).toBeGreaterThanOrEqual(canopy.count);
    const colors = new Set();
    const c = new THREE.Color();
    for (let i = 0; i < canopy.count; i++) { canopy.getColorAt(i, c); colors.add(c.getHex()); }
    expect(colors.size).toBeGreaterThanOrEqual(4);
  });
  it('has coolers, sandcastles, beach balls and lifeguard flags', () => {
    const extras = props.getObjectByName('beachStuff');
    expect(extras).toBeTruthy();
    expect(props.userData.counts.coolers).toBeGreaterThanOrEqual(3);
    expect(props.userData.counts.sandcastles).toBeGreaterThanOrEqual(2);
    expect(props.userData.counts.balls).toBeGreaterThanOrEqual(3);
    expect(props.userData.counts.flags).toBeGreaterThanOrEqual(2);
  });
});

describe('budget', () => {
  it('vendors + props stay under 40k triangles and ~20 meshes', () => {
    const ctx = makeCtx();
    createVendors(ctx);
    createProps(ctx);
    const s = stats(ctx.scene);
    expect(s.tris).toBeLessThan(40000);
    expect(s.meshes).toBeLessThanOrEqual(24);
  });
});
