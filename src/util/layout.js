// World zones and a simple footprint registry so nothing spawns on top of
// anything else or on the boardwalk.
export const WATER_Z = -60;
export const PARK_Z = 10;
export const BOUNDS = 250;
const TRACK_CLEARANCE = 3;

export function createLayout(track) {
  const footprints = [];
  const zone = (x, z) => (z < WATER_Z ? 'water' : z < PARK_Z ? 'sand' : 'park');

  function reserve(x, z, radius) {
    if (Math.abs(x) + radius > BOUNDS || Math.abs(z) + radius > BOUNDS) return false;
    if (track.distanceTo(x, z) < radius + track.width / 2 + TRACK_CLEARANCE) return false;
    for (const f of footprints) {
      if (Math.hypot(f.x - x, f.z - z) < f.r + radius) return false;
    }
    footprints.push({ x, z, r: radius });
    return true;
  }

  return { zone, reserve, footprints };
}
