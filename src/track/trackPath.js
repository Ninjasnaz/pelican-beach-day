import * as THREE from 'three';

// Hand-placed loop: beach leg near z = -20, park leg near z = +35, with S-bends
// on both legs so it reads as a winding boardwalk, not an oval. y is deck height.
const CONTROL_POINTS = [
  // beach leg, heading +x
  [-70, 0.6, -14],
  [-45, 1.6, -20],
  [-22, 2.6, -15],
  [0, 1.4, -21],
  [22, 0.6, -14],
  [45, 1.4, -20],
  [68, 2.2, -15],
  // east turn
  [84, 2.6, -2],
  [86, 2.0, 14],
  [78, 1.2, 28],
  // park leg, heading -x
  [58, 0.7, 35],
  [36, 1.6, 30],
  [14, 2.8, 37],
  [-8, 2.0, 30],
  [-30, 0.8, 37],
  [-52, 1.4, 31],
  [-70, 2.0, 33],
  // west turn
  [-84, 1.6, 24],
  [-88, 1.0, 9],
  [-83, 0.6, -4],
];

const SAMPLES = 400;

export function createTrack() {
  const curve = new THREE.CatmullRomCurve3(
    CONTROL_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    true,
    'centripetal',
  );
  curve.arcLengthDivisions = 2000;
  const length = curve.getLength();
  const cache = curve.getSpacedPoints(SAMPLES);

  return {
    curve,
    length,
    width: 3.2,
    // u is arc-length fraction around the loop, wraps at 1.
    pointAt: (u) => curve.getPointAt(((u % 1) + 1) % 1),
    tangentAt: (u) => curve.getTangentAt(((u % 1) + 1) % 1),
    distanceTo(x, z) {
      let best = Infinity;
      for (let i = 0; i < SAMPLES; i++) {
        const a = cache[i], b = cache[i + 1];
        const dx = b.x - a.x, dz = b.z - a.z;
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
        const d = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
        if (d < best) best = d;
      }
      return best;
    },
  };
}
