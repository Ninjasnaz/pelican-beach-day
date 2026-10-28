import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { syncViewport } from '../src/util/viewport.js';

describe('syncViewport', () => {
  it('sizes the renderer and camera from the canvas box, not window.innerHeight', () => {
    const calls = [];
    const renderer = { setSize: (w, h, upd) => calls.push([w, h, upd]), setPixelRatio: (r) => calls.push(['ratio', r]) };
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    const canvas = { clientWidth: 390, clientHeight: 664 };
    syncViewport(renderer, camera, canvas, 3);
    expect(calls).toContainEqual([390, 664, false]);
    expect(calls).toContainEqual(['ratio', 2]); // capped at 2
    expect(camera.aspect).toBeCloseTo(390 / 664, 6);
  });
});
