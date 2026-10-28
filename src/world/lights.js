import * as THREE from 'three';
import { SUN_DIRECTION } from './sky.js';

// Soft sky fill plus one warm, shadow-casting sun.
export function createLights(ctx) {
  const hemi = new THREE.HemisphereLight(0xdff3ff, 0xf2c38a, 1.6);
  ctx.scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0d6, 2.4);
  // Light comes from the sun's side of the sky but a bit overhead so shadows stay readable.
  const dir = SUN_DIRECTION.clone().setY(0.75).normalize();
  sun.position.copy(dir).multiplyScalar(150);
  sun.target.position.set(0, 0, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const cam = sun.shadow.camera;
  cam.left = -125; cam.right = 125; cam.top = 110; cam.bottom = -110;
  cam.near = 10; cam.far = 400;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.04;
  ctx.scene.add(sun, sun.target);
  return { sun, hemi };
}
