import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { mulberry32, SEED } from '../src/util/rng.js';
import { createTrack } from '../src/track/trackPath.js';
import { createLayout, WATER_Z } from '../src/util/layout.js';
import { heightAt } from '../src/world/terrain.js';
import { createBuildings } from '../src/buildings/index.js';

const TYPES = ['bathroom', 'clubhouse', 'iceCream', 'lifeguardTower', 'surfShack', 'snackBar', 'bikeRental', 'pier'];

function setup() {
  const track = createTrack();
  const layout = createLayout(track);
  const calls = [];
  const ctx = {
    scene: new THREE.Scene(),
    rng: mulberry32(SEED),
    heightAt,
    zone: layout.zone,
    track,
    reserve: (x, z, r) => {
      const ok = layout.reserve(x, z, r);
      calls.push({ x, z, r, ok });
      return ok;
    },
    addUpdater: () => {},
  };
  const groups = createBuildings(ctx);
  return { ctx, groups, calls, track };
}

const byType = (groups, t) => groups.find((g) => g.userData.type === t);

describe('buildings', () => {
  const { ctx, groups, calls, track } = setup();

  it('places 8 distinct building types and adds them to the scene', () => {
    expect(groups).toHaveLength(8);
    expect(groups.map((g) => g.userData.type).sort()).toEqual([...TYPES].sort());
    for (const g of groups) expect(g.parent).toBe(ctx.scene);
  });

  it('has every footprint accepted by reserve and non-overlapping', () => {
    expect(calls.length).toBeGreaterThanOrEqual(8);
    expect(calls.every((c) => c.ok)).toBe(true);
    // The recorded footprints are accepted again by a fresh layout (no overlaps, off the track).
    const fresh = createLayout(track);
    for (const c of calls) expect(fresh.reserve(c.x, c.z, c.r)).toBe(true);
  });

  it('puts the pier out over the water without crossing the boardwalk', () => {
    const pier = byType(groups, 'pier');
    const box = new THREE.Box3().setFromObject(pier);
    expect(box.min.z).toBeLessThan(WATER_Z);
    // Sample along the pier's axis and keep clear of the track.
    const axisX = pier.position.x;
    for (let z = box.min.z; z <= box.max.z; z += 1) {
      expect(track.distanceTo(axisX, z)).toBeGreaterThan(track.width / 2 + 2);
    }
    for (const x of [box.min.x, box.max.x]) {
      expect(track.distanceTo(x, box.max.z)).toBeGreaterThan(track.width / 2 + 1);
    }
  });

  it('puts the lifeguard tower on sand and the clubhouse and bathroom in park or sand', () => {
    const z = (t) => ctx.zone(byType(groups, t).position.x, byType(groups, t).position.z);
    expect(z('lifeguardTower')).toBe('sand');
    expect(['park', 'sand']).toContain(z('clubhouse'));
    expect(['park', 'sand']).toContain(z('bathroom'));
  });

  it('sits each building on the ground', () => {
    for (const g of groups) {
      if (g.userData.type === 'pier') continue;
      expect(g.position.y).toBeCloseTo(heightAt(g.position.x, g.position.z), 5);
    }
  });

  it('stays under 60k triangles and a small mesh count', () => {
    let tris = 0, meshes = 0;
    for (const g of groups) {
      g.traverse((o) => {
        if (!o.isMesh) return;
        meshes++;
        const geo = o.geometry;
        tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
      });
    }
    expect(tris).toBeLessThan(60000);
    expect(meshes).toBeLessThanOrEqual(30);
  });
});
