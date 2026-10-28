import * as THREE from 'three';
import { mulberry32, SEED } from './util/rng.js';
import { syncViewport } from './util/viewport.js';
import { createTrack } from './track/trackPath.js';
import { createLayout } from './util/layout.js';
import { heightAt, createTerrain } from './world/terrain.js';
import { createSky } from './world/sky.js';
import { createLights } from './world/lights.js';
import { createOcean } from './world/ocean.js';
import { createPark } from './world/park.js';
import { createBoardwalk } from './track/boardwalk.js';
import { createRider } from './pelican/rider.js';
import { createBuildings } from './buildings/index.js';
import { createVendors } from './vendors/index.js';
import { createProps } from './props/index.js';
import { createCrowd } from './people/crowd.js';
import { isTouchPrimary } from './camera/device.js';
import { createCameraManager } from './camera/cameraManager.js';
import { createHud } from './ui/hud.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, heightAt(0, 78) + 7, 78);
camera.lookAt(0, 0, -30);

const updaters = [];
const track = createTrack();
const layout = createLayout(track);
const ctx = {
  scene,
  camera,
  renderer,
  rng: mulberry32(SEED),
  heightAt,
  zone: layout.zone,
  track,
  reserve: layout.reserve,
  addUpdater: (fn) => updaters.push(fn),
};

createLights(ctx);
createSky(ctx);
createTerrain(ctx);
createOcean(ctx);
createBoardwalk(ctx);
// Big footprints claim their spots first; the park fills in around everything.
ctx.reserve(0, 75, 6); // opening camera spot
createBuildings(ctx);
const vendors = createVendors(ctx);
createProps(ctx);
createCrowd(ctx, 60, { queueSpots: vendors.queueSpots });
createPark(ctx);
const rider = createRider(ctx);

const resize = () => syncViewport(renderer, camera, canvas, window.devicePixelRatio);
resize();
window.addEventListener('resize', resize);
if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);

const touch = isTouchPrimary();
const debug = { ready: false, renderer, mode: 'free', rider, camera, ctx };
let hud;
const cameras = createCameraManager(ctx, camera, rider, {
  touch,
  onMode: (mode) => { debug.mode = mode; hud?.setMode(mode); },
});
hud = createHud(document.getElementById('hud'), {
  touch,
  onToggleFollow: () => cameras.setMode(cameras.mode === 'follow' ? 'free' : 'follow'),
});
hud.setMode(cameras.mode);
debug.setMode = cameras.setMode;
ctx.addUpdater((dt) => cameras.update(dt));

// Debug hook for the smoke test: park the camera beside the pelican.
let closeUpOn = false;
debug.closeUp = (on = true) => { closeUpOn = on; };
ctx.addUpdater(() => {
  if (!closeUpOn) return;
  const p = rider.getPosition();
  const f = rider.getForward();
  const side = new THREE.Vector3(-f.z, 0, f.x).normalize();
  camera.position.copy(p).addScaledVector(side, 3.2).addScaledVector(f, 0.6).add(new THREE.Vector3(0, 1.4, 0));
  camera.lookAt(p.x, p.y + 1.1, p.z);
});
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
