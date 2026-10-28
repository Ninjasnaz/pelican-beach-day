import * as THREE from 'three';

const tmp = new THREE.Object3D();

// Build one InstancedMesh from a list of {x, y, z, ry, sx, sy, sz} transforms.
export function instanced(geometry, material, items, { cast = true, receive = true } = {}) {
  const im = new THREE.InstancedMesh(geometry, material, Math.max(items.length, 1));
  items.forEach((it, i) => {
    tmp.position.set(it.x, it.y ?? 0, it.z);
    tmp.rotation.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0);
    const s = it.s ?? 1;
    tmp.scale.set(it.sx ?? s, it.sy ?? s, it.sz ?? s);
    tmp.updateMatrix();
    im.setMatrixAt(i, tmp.matrix);
  });
  im.count = items.length;
  im.castShadow = cast;
  im.receiveShadow = receive;
  im.computeBoundingSphere();
  return im;
}
