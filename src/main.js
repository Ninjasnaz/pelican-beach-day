import * as THREE from 'three';
import { mulberry32, SEED } from './util/rng.js';
import { palette } from './util/palette.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 1.7, 75);
camera.lookAt(0, 2, -20);

const updaters = [];
const ctx = {
  scene,
  camera,
  renderer,
  rng: mulberry32(SEED),
  addUpdater: (fn) => updaters.push(fn),
};

// Placeholder ground until the world module lands.
const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshLambertMaterial({ color: palette.sand }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
scene.add(new THREE.HemisphereLight(0xffffff, 0x888866, 2));

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

const debug = { ready: false, renderer, mode: 'free', rider: null, camera, ctx };
window.__pelican = debug;

const clock = new THREE.Clock();
let elapsed = 0;
renderer.setAnimationLoop(() => {
  // Clamp dt so a hidden tab coming back doesn't teleport anything.
  const dt = Math.min(clock.getDelta(), 0.1);
  elapsed += dt;
  for (const fn of updaters) fn(dt, elapsed);
  renderer.render(scene, camera);
  debug.ready = true;
});
