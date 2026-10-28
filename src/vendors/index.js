import * as THREE from 'three';
import { palette } from '../util/palette.js';
import { range } from '../util/rng.js';
import { createCart } from './cart.js';
import { createVendorFigure } from './vendorFigure.js';

// Where each cart wants to be: a leg of the boardwalk and an x. The first free
// spot beside the boardwalk (inside the loop first, then outside) wins.
const WANTS = [
  { type: 'iceCream', leg: 'beach', x: -46 },
  { type: 'lemonade', leg: 'beach', x: -2 },
  { type: 'cottonCandy', leg: 'beach', x: 40 },
  { type: 'hotDog', leg: 'park', x: 34 },
  { type: 'taco', leg: 'park', x: -34 },
];
const OFFSETS = [7.6, 8.8, 10.2];     // meters from the boardwalk centerline
const FOOTPRINT = 2.4;                // cart + umbrella
const SAMPLES = 500;
const QUEUE_DISTANCES = [2.1, 3.0, 3.9];
const QUEUE_SIDE = [0, 0.35, -0.3];

const inOpeningCorridor = (x, z) => Math.abs(x) < 8 + Math.max(0, z - 45) * 0.2 && z > 45 && z < 90;

export function createVendors(ctx) {
  const group = new THREE.Group();
  group.name = 'vendors';
  const { track } = ctx;

  // Centerline samples: position and unit normal pointing into the loop.
  const line = Array.from({ length: SAMPLES }, (_, i) => {
    const p = track.pointAt(i / SAMPLES), t = track.tangentAt(i / SAMPLES);
    const l = Math.hypot(t.x, t.z) || 1;
    return { x: p.x, z: p.z, nx: -t.z / l, nz: t.x / l };
  });
  const nearest = (x, z) => line.reduce((b, p) => (Math.hypot(p.x - x, p.z - z) < Math.hypot(b.x - x, b.z - z) ? p : b));

  function findSpot({ leg, x: wantX }) {
    const onLeg = line.filter((p) => (leg === 'beach' ? p.z < -8 : p.z > 26) && Math.abs(p.x - wantX) < 30);
    onLeg.sort((a, b) => Math.abs(a.x - wantX) - Math.abs(b.x - wantX));
    for (const p of onLeg) {
      for (const side of [1, -1]) {
        for (const off of OFFSETS) {
          const x = p.x + p.nx * off * side, z = p.z + p.nz * off * side;
          const d = track.distanceTo(x, z);
          if (d > 11.8 || ctx.zone(x, z) === 'water' || inOpeningCorridor(x, z)) continue;
          if (ctx.reserve(x, z, FOOTPRINT)) return { x, z };
        }
      }
    }
    throw new Error(`No free spot for ${leg} cart`);
  }

  const carts = [];
  const vendors = [];
  const queueSpots = [];
  const animated = [];

  for (const want of WANTS) {
    const { x, z } = findSpot(want);
    const cart = createCart(want.type, palette);
    // Face the boardwalk: customers walk up from that side.
    const q = nearest(x, z);
    const fx = (q.x - x) / (Math.hypot(q.x - x, q.z - z) || 1), fz = (q.z - z) / (Math.hypot(q.x - x, q.z - z) || 1);
    const yaw = Math.atan2(fx, fz);
    cart.position.set(x, ctx.heightAt(x, z), z);
    cart.rotation.y = yaw;
    group.add(cart);
    carts.push(cart);

    // Vendor stands behind the counter, a little off-center.
    const vendor = createVendorFigure(ctx.rng);
    const lx = range(ctx.rng, -0.4, 0.4), lz = -0.95;
    const vx = x + Math.cos(yaw) * lx + Math.sin(yaw) * lz, vz = z - Math.sin(yaw) * lx + Math.cos(yaw) * lz;
    vendor.position.set(vx, ctx.heightAt(vx, vz), vz);
    vendor.rotation.order = 'YXZ'; // yaw first, then lean about the figure's own axes
    vendor.rotation.y = yaw;
    group.add(vendor);
    vendors.push(vendor);
    cart.userData.vendor = vendor;

    animated.push({
      vendor,
      head: vendor.getObjectByName('head'),
      yaw,
      phase: ctx.rng() * Math.PI * 2,
      period: range(ctx.rng, 11, 19),   // seconds between leans
      offset: ctx.rng() * 30,
      leanTime: range(ctx.rng, 2.4, 3.6),
    });

    // Queue: a short line out the front, staggered slightly so it looks natural.
    const sx = Math.cos(yaw), sz = -Math.sin(yaw);
    QUEUE_DISTANCES.forEach((dist, i) => {
      const qx = x + fx * dist + sx * QUEUE_SIDE[i], qz = z + fz * dist + sz * QUEUE_SIDE[i];
      if (ctx.zone(qx, qz) === 'water' || track.distanceTo(qx, qz) < 2.3) return;
      queueSpots.push({ x: qx, z: qz, facing: Math.atan2(x - qx, z - qz) });
    });
  }

  ctx.scene.add(group);

  // Gentle sway always, plus an occasional lean on the counter.
  ctx.addUpdater((dt, t) => {
    for (const a of animated) {
      const cyc = (t + a.offset) % a.period;
      const k = cyc < a.leanTime ? Math.sin((Math.PI * cyc) / a.leanTime) : 0;
      const lean = k * k * (3 - 2 * k);
      a.vendor.rotation.x = Math.sin(t * 0.55 + a.phase * 1.7) * 0.015 + lean * 0.3;
      a.vendor.rotation.z = Math.sin(t * 0.8 + a.phase) * 0.03;
      a.head.rotation.y = Math.sin(t * 0.7 + a.phase) * 0.35 * (1 - lean);
      a.head.rotation.x = -lean * 0.25 + Math.sin(t * 1.1 + a.phase) * 0.04;
    }
  });

  return { carts, vendors, queueSpots };
}
