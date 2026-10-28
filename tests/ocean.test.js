import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createOcean, SHORE_START } from '../src/world/ocean.js';
import { heightAt } from '../src/world/terrain.js';

describe('ocean', () => {
  it('starts at the shoreline, never under the dry sand', () => {
    const scene = new THREE.Scene();
    createOcean({ scene, addUpdater: () => {} });
    const water = scene.getObjectByName('ocean');
    water.geometry.computeBoundingBox();
    const nearEdge = water.geometry.boundingBox.max.z;
    expect(nearEdge).toBeLessThanOrEqual(SHORE_START + 1e-6);
    // Ground at the water's near edge is already low enough that 0.55 m waves stay wet.
    for (let x = -200; x <= 200; x += 10) expect(heightAt(x, nearEdge)).toBeLessThan(0.05);
  });
});

import { WAVE_AMPLITUDE } from '../src/world/ocean.js';
describe('waves', () => {
  it('never dip low enough to expose the seabed', () => {
    for (let x = -300; x <= 300; x += 20)
      for (let z = -400; z <= -70; z += 10) expect(heightAt(x, z)).toBeLessThan(-WAVE_AMPLITUDE);
  });
});
