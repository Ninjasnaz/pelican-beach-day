import * as THREE from 'three';

// Shared toon materials, cached by color so every module reuses the same
// instances (fewer shader programs, fewer state changes).
let gradient;
function gradientMap() {
  if (!gradient) {
    const data = new Uint8Array([90, 170, 230, 255]);
    gradient = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}

const cache = new Map();
export function toon(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), ...opts }));
  return cache.get(key);
}

// Mesh helper: casts and receives shadows by default.
export function mesh(geometry, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}
