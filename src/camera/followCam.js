import * as THREE from 'three';

// Chase camera that trails the pelican; drag orbits around him, scroll zooms.
export function createFollowCam(rider) {
  // Default to a three-quarter view so his beak and pouch show, not just his back.
  const orbit = { yaw: 0.6, elevation: THREE.MathUtils.degToRad(18), distance: 7 };
  const target = new THREE.Vector3();
  const desired = new THREE.Vector3();

  function desiredPose() {
    const p = rider.getPosition();
    const f = rider.getForward();
    const heading = Math.atan2(f.x, f.z);
    const a = heading + Math.PI + orbit.yaw;
    const d = orbit.distance;
    target.set(p.x, p.y + 1.3, p.z);
    desired.set(
      p.x + Math.sin(a) * Math.cos(orbit.elevation) * d,
      target.y + Math.sin(orbit.elevation) * d,
      p.z + Math.cos(a) * Math.cos(orbit.elevation) * d,
    );
    return { position: desired, target };
  }

  return {
    orbit,
    desiredPose,
    drag(dx, dy) {
      orbit.yaw -= dx * 0.005;
      orbit.elevation = THREE.MathUtils.clamp(orbit.elevation + dy * 0.004, THREE.MathUtils.degToRad(4), THREE.MathUtils.degToRad(75));
    },
    zoom(delta) {
      orbit.distance = THREE.MathUtils.clamp(orbit.distance * Math.exp(delta * 0.001), 3, 40);
    },
  };
}
