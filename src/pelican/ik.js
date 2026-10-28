import * as THREE from 'three';

const _dir = new THREE.Vector3();
const _bend = new THREE.Vector3();

// Two-bone IK (law of cosines). Returns knee and foot positions for a leg from
// `hip` reaching for `target`, with the knee bending toward `bendHint`.
export function solveTwoBone(hip, target, l1, l2, bendHint) {
  _dir.subVectors(target, hip);
  let dist = _dir.length();
  if (dist < 1e-6) {
    _dir.copy(bendHint).normalize().negate().add(new THREE.Vector3(0, -1, 0)).normalize();
    dist = 1e-6;
  } else {
    _dir.divideScalar(dist);
  }
  const reach = Math.min(dist, l1 + l2 - 1e-6);
  const minReach = Math.abs(l1 - l2) + 1e-6;
  const d = Math.max(reach, minReach);

  // Angle at the hip between the hip->target line and the thigh.
  const cosA = THREE.MathUtils.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const a = Math.acos(cosA);

  // Bend direction: hint with its component along the leg removed.
  _bend.copy(bendHint).addScaledVector(_dir, -bendHint.dot(_dir));
  if (_bend.lengthSq() < 1e-10) _bend.set(0, 0, 1).addScaledVector(_dir, -_dir.z);
  _bend.normalize();

  const knee = hip.clone()
    .addScaledVector(_dir, Math.cos(a) * l1)
    .addScaledVector(_bend, Math.sin(a) * l1);
  const foot = dist > l1 + l2 ? hip.clone().addScaledVector(_dir, l1 + l2) : hip.clone().addScaledVector(_dir, d);
  return { knee, foot };
}
