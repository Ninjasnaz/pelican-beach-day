import { Kit, finish } from './kit.js';

export const PIER_LENGTH = 56; // walkway length from the shore end
export const PIER_END = 5.5; // depth of the bait-shop platform past the walkway
const WIDTH = 3.4, PW = 7.0, TOP = 1.1;

// Small pier on posts with a bait shop at the end. Origin is the center of the
// shore end; the pier runs toward -z, the hut faces +z (back at the shore).
export function buildPier(p) {
  const k = new Kit();
  const L = PIER_LENGTH, E = PIER_END, deckY = TOP - 0.14;

  // walkway planks, alternating tones, plus stringers
  for (let i = 0; i < L; i++) k.box(WIDTH, 0.14, 0.94, i % 2 ? p.plank : p.plankDark, 0, deckY, -(i + 0.5));
  for (const sx of [-1, 1]) k.box(0.22, 0.28, L + E, p.post, sx * (WIDTH / 2 - 0.2), deckY - 0.28, -(L + E) / 2);
  // wider end platform
  for (let i = 0; i < 6; i++) k.box(PW, 0.14, 0.92, i % 2 ? p.plank : p.plankDark, 0, deckY, -L - 0.46 - i * 0.92 + 0.05);
  // shore steps
  k.box(WIDTH, 0.3, 0.6, p.woodLight, 0, 0.0, 0.5);
  k.box(WIDTH, 0.6, 0.6, p.woodLight, 0, 0.0, 0.0);

  // posts (pairs every 4 m) with cross bracing
  for (let z = -2; z > -(L + E) + 1; z -= 4) {
    for (const sx of [-1, 1]) k.cyl(0.15, 0.17, TOP + 1.6, p.post, sx * (WIDTH / 2 - 0.15), -1.5, z, { seg: 6 });
    k.box(WIDTH, 0.12, 0.12, p.post, 0, 0.1, z);
  }
  for (const sx of [-1, 1]) for (const z of [-L - E + 1.2, -L - E + 4.4]) k.cyl(0.16, 0.18, TOP + 1.6, p.post, sx * (PW / 2 - 0.25), -1.5, z, { seg: 6 });

  // railings (walkway sides, platform sides and end)
  const rh = 0.95, rail = TOP + rh;
  for (const sx of [-1, 1]) {
    for (let z = -1; z > -L; z -= 4) k.box(0.11, rh, 0.11, p.woodLight, sx * (WIDTH / 2 - 0.08), TOP, z);
    k.box(0.1, 0.1, L, p.woodLight, sx * (WIDTH / 2 - 0.08), rail - 0.1, -L / 2);
    k.box(0.07, 0.07, L, p.woodLight, sx * (WIDTH / 2 - 0.08), TOP + 0.45, -L / 2);
    k.box(0.1, 0.1, E + 0.1, p.woodLight, sx * (PW / 2 - 0.08), rail - 0.1, -L - E / 2);
    for (const z of [-L - 0.3, -L - E / 2, -L - E + 0.1]) k.box(0.11, rh, 0.11, p.woodLight, sx * (PW / 2 - 0.08), TOP, z);
  }
  k.box(PW, 0.1, 0.1, p.woodLight, 0, rail - 0.1, -L - E + 0.1);
  k.box(PW, 0.07, 0.07, p.woodLight, 0, TOP + 0.45, -L - E + 0.1);
  // widening rail from walkway to platform
  for (const sx of [-1, 1]) k.box((PW - WIDTH) / 2 + 0.1, 0.1, 0.1, p.woodLight, sx * (WIDTH / 2 + (PW - WIDTH) / 4 - 0.1), rail - 0.1, -L);

  // lamp posts every 14 m and a bench mid-way
  for (const z of [-10, -24, -38]) {
    for (const sx of [-1, 1]) {
      k.cyl(0.05, 0.06, 2.4, p.shadowDark, sx * (WIDTH / 2 - 0.08), TOP, z, { seg: 5 });
      k.sphere(0.2, p.lightBeam, sx * (WIDTH / 2 - 0.08), TOP + 2.55, z, { seg: 6 });
    }
  }
  k.box(1.6, 0.1, 0.45, p.woodDark, 0, TOP + 0.45, -17);
  k.box(1.6, 0.4, 0.07, p.woodDark, 0, TOP + 0.6, -17.22);
  for (const sx of [-0.7, 0.7]) k.box(0.08, 0.45, 0.4, p.woodDark, sx, TOP, -17);

  // bait shop at the far end
  const hz = -L - E / 2 - 0.35, HW = 4.2, HD = 3.2, HH = 2.4;
  k.box(HW, HH, HD, p.wallRed, 0, TOP, hz);
  k.box(HW + 0.04, 0.5, HD + 0.04, p.white, 0, TOP, hz);
  k.prism(HW + 0.8, 1.3, HD + 0.8, p.woodDark, 0, TOP + HH, hz, { ry: Math.PI / 2 });
  const fz = hz + HD / 2;
  k.box(1.0, 1.9, 0.1, p.shadowDark, -0.9, TOP, fz + 0.02);
  k.box(1.2, 0.9, 0.1, p.glass, 1.0, TOP + 0.85, fz + 0.02);
  k.box(1.4, 0.1, 0.35, p.white, 1.0, TOP + 0.8, fz + 0.15);
  // fish sign on the front above the door
  k.box(2.4, 0.7, 0.08, p.wallYellow, 0, TOP + HH - 0.8, fz + 0.04);
  k.ellipsoid(0.5, 0.24, 0.07, p.fishBlue, -0.2, TOP + HH - 0.45, fz + 0.1, { seg: 8 });
  k.prism(0.5, 0.4, 0.07, p.fishBlue, 0.7, TOP + HH - 0.45, fz + 0.1, { rz: Math.PI / 2 });
  k.sphere(0.06, p.white, -0.45, TOP + HH - 0.42, fz + 0.16, { seg: 4 });
  // crates with fish, buckets, rods leaning on the wall
  k.box(0.7, 0.45, 0.7, p.woodLight, 1.8, TOP, fz + 0.7);
  k.ellipsoid(0.2, 0.07, 0.07, p.fishBlue, 1.75, TOP + 0.5, fz + 0.7, { seg: 6 });
  k.box(0.7, 0.45, 0.7, p.woodLight, -1.7, TOP, fz + 0.6);
  k.cyl(0.26, 0.2, 0.45, p.boardBlue, -1.95, TOP, fz + 1.4);
  k.cyl(0.24, 0.18, 0.4, p.boardOrange, 2.55, TOP, fz + 0.2);
  for (const [dx, a] of [[2.15, 0.09], [2.3, 0.14], [-2.2, -0.12]]) k.cyl(0.02, 0.025, 3.0, p.shadowDark, dx + Math.sign(dx) * 0.0, TOP, fz + 0.1, { rz: -Math.sign(dx) * a, seg: 4 });
  // rope coil
  k.torus(0.28, 0.07, p.wicker, 2.0, TOP + 0.07, -L - E + 1.0, { rx: Math.PI / 2, seg: 8 });
  return finish(k, 'pier', { center: false });
}
