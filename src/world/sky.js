import * as THREE from 'three';
import { palette } from '../util/palette.js';

export const SUN_DIRECTION = new THREE.Vector3(-0.35, 0.22, -1).normalize();

// Gradient dome (peach horizon to light blue) with a big soft sun low over the ocean.
export function createSky(ctx) {
  const geo = new THREE.SphereGeometry(900, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(palette.skyTop) },
      horizon: { value: new THREE.Color(palette.skyHorizon) },
      sunColor: { value: new THREE.Color(palette.sun) },
      sunDir: { value: SUN_DIRECTION },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top, horizon, sunColor, sunDir;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(horizon, top, pow(h, 0.55));
        float d = dot(normalize(vDir), sunDir);
        col = mix(col, sunColor, smoothstep(0.80, 1.0, d) * 0.45);  // glow
        col = mix(col, sunColor, smoothstep(0.9975, 0.9985, d));     // disc
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.name = 'sky';
  sky.frustumCulled = false;
  ctx.scene.add(sky);
  ctx.scene.fog = new THREE.Fog(palette.skyHorizon, 220, 750);

  // A few flat, puffy clouds.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
  const puff = new THREE.SphereGeometry(1, 12, 8);
  const clouds = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const cloud = new THREE.Group();
    const n = 3 + Math.floor(ctx.rng() * 3);
    for (let j = 0; j < n; j++) {
      const p = new THREE.Mesh(puff, cloudMat);
      p.position.set(j * 9 - n * 4, ctx.rng() * 3, ctx.rng() * 4);
      p.scale.set(9 + ctx.rng() * 6, 4 + ctx.rng() * 2, 5);
      cloud.add(p);
    }
    const a = -Math.PI * 0.85 + (i / 9) * Math.PI * 0.7;
    cloud.position.set(Math.cos(a) * 520, 110 + ctx.rng() * 70, Math.sin(a) * 520 - 120);
    cloud.lookAt(0, cloud.position.y, 0);
    clouds.add(cloud);
  }
  ctx.scene.add(clouds);
  ctx.addUpdater((dt) => { clouds.rotation.y += dt * 0.002; });
  return sky;
}
