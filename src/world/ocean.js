import * as THREE from 'three';
import { palette } from '../util/palette.js';
import { toon, mesh } from '../util/materials.js';
import { WATER_LEVEL } from './terrain.js';

export const SHORE_START = -48;
// Peak wave height; stays above the seabed (-0.45) so no sand shows through troughs.
export const WAVE_AMPLITUDE = 0.3;

// Water plane with gentle vertex waves (flat shading gives the faceted look),
// and sailboats drifting out past the beach.
export function createOcean(ctx) {
  const geo = new THREE.PlaneGeometry(1400, 700, 140, 70);
  geo.rotateX(-Math.PI / 2);
  // Starts at the shoreline (ground dips below water around z = -48) so waves
  // never poke up through the sand.
  geo.translate(0, WATER_LEVEL, SHORE_START - 350);
  const mat = new THREE.MeshPhongMaterial({ color: palette.ocean, flatShading: true, shininess: 70, specular: 0x557788 });
  const time = { value: 0 };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float w = (sin(position.x * 0.08 + uTime * 0.9) * 0.33
                + sin(position.z * 0.11 - uTime * 1.3) * 0.27
                + sin((position.x + position.z) * 0.035 + uTime * 0.5) * 0.40) * ${WAVE_AMPLITUDE.toFixed(3)};
        transformed.y += w;`,
      );
  };
  const water = new THREE.Mesh(geo, mat);
  water.receiveShadow = true;
  water.name = 'ocean';
  ctx.scene.add(water);

  const boats = [makeSailboat(), makeSailboat(palette.bandanaRed)];
  boats[0].position.set(-60, WATER_LEVEL, -190);
  boats[1].position.set(90, WATER_LEVEL, -280);
  boats[1].scale.setScalar(1.3);
  boats.forEach((b) => ctx.scene.add(b));

  ctx.addUpdater((dt, t) => {
    time.value = t;
    boats.forEach((b, i) => {
      b.position.x += dt * (i ? -0.8 : 1.1);
      if (b.position.x > 260) b.position.x = -260;
      if (b.position.x < -260) b.position.x = 260;
      b.rotation.z = Math.sin(t * 0.8 + i) * 0.05;
      b.position.y = WATER_LEVEL + Math.sin(t * 1.1 + i * 2) * 0.15;
    });
  });
  return water;
}

function makeSailboat(stripe = palette.capBlue) {
  const g = new THREE.Group();
  const hull = mesh(new THREE.CylinderGeometry(1.2, 0.7, 1, 6, 1), toon(palette.white));
  hull.scale.set(4, 1, 1.4);
  hull.rotation.y = Math.PI / 6;
  hull.position.y = 0.4;
  const band = mesh(new THREE.CylinderGeometry(1.22, 1.15, 0.25, 6), toon(stripe));
  band.scale.copy(hull.scale);
  band.rotation.y = hull.rotation.y;
  band.position.y = 0.78;
  const mast = mesh(new THREE.CylinderGeometry(0.1, 0.1, 9), toon(palette.post));
  mast.position.y = 5;
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0); sailShape.lineTo(3.8, 0); sailShape.lineTo(0, 8); sailShape.lineTo(0, 0);
  const sail = mesh(new THREE.ShapeGeometry(sailShape), toon(palette.sail, { side: THREE.DoubleSide }));
  sail.position.set(0.15, 1.2, 0);
  const jibShape = new THREE.Shape();
  jibShape.moveTo(0, 0); jibShape.lineTo(-2.6, 0); jibShape.lineTo(0, 6.5);
  const jib = mesh(new THREE.ShapeGeometry(jibShape), toon(palette.sail, { side: THREE.DoubleSide }));
  jib.position.set(-0.15, 1.2, 0);
  g.add(hull, band, mast, sail, jib);
  return g;
}
