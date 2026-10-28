import { Kit, finish } from './kit.js';

// Public restroom: two doors (blue = men, pink = women) with figure signs above.
export function buildBathroom(p) {
  const k = new Kit();
  const W = 4.8, D = 3.4, H = 3.3, fz = D / 2;

  k.box(W + 0.5, 0.15, D + 0.5, p.concrete, 0, 0, 0); // slab
  k.box(W, H, D, p.wallMint, 0, 0.15, 0);
  k.box(W + 0.5, 0.28, D + 0.5, p.roofTeal, 0, H + 0.15, 0); // roof slab
  k.box(W + 0.1, 0.35, D + 0.1, p.white, 0, 0.15, 0); // base trim
  k.cyl(0.18, 0.18, 0.4, p.chrome, 1.4, H + 0.43, -0.6, { seg: 6 }); // roof vent

  // two doors, each with a white sign panel and a figure above
  for (const [x, doorColor, woman] of [[-1.15, p.wallBlue, false], [1.15, p.wallPink, true]]) {
    k.box(1.2, 2.15, 0.1, p.white, x, 0.15, fz + 0.03); // frame
    k.box(1.0, 2.0, 0.12, doorColor, x, 0.15, fz + 0.05);
    k.box(0.1, 0.1, 0.1, p.chrome, x + 0.32, 1.1, fz + 0.14); // knob
    k.box(1.05, 0.95, 0.08, p.white, x, 2.3, fz + 0.04); // sign panel
    const fc = woman ? p.wallPink : p.wallBlue;
    const z = fz + 0.12;
    k.sphere(0.13, fc, x, 3.0, z, { seg: 6 });
    if (woman) {
      k.cone(0.27, 0.6, fc, x, 2.4, z, { seg: 6 });
      k.box(0.08, 0.22, 0.08, fc, x - 0.07, 2.35, z);
      k.box(0.08, 0.22, 0.08, fc, x + 0.07, 2.35, z);
    } else {
      k.box(0.36, 0.42, 0.08, fc, x, 2.5, z);
      k.box(0.09, 0.4, 0.08, fc, x - 0.25, 2.5, z);
      k.box(0.09, 0.4, 0.08, fc, x + 0.25, 2.5, z);
      k.box(0.1, 0.36, 0.08, fc, x - 0.08, 2.15, z);
      k.box(0.1, 0.36, 0.08, fc, x + 0.08, 2.15, z);
    }
  }
  // divider line between the two sides
  k.box(0.1, 3.1, 0.08, p.roofTeal, 0, 0.15, fz + 0.03);

  // high vent windows on the side walls
  for (const sx of [-1, 1]) k.box(0.08, 0.35, 1.2, p.glass, sx * (W / 2 + 0.01), 2.3, 0);

  // hand-wash sink and bench outside
  k.box(1.2, 0.1, 0.5, p.woodLight, 0.0, 0.5, fz + 0.9);
  k.box(0.1, 0.5, 0.4, p.woodDark, -0.5, 0, fz + 0.9);
  k.box(0.1, 0.5, 0.4, p.woodDark, 0.5, 0, fz + 0.9);
  // planters
  for (const sx of [-1, 1]) {
    k.box(0.7, 0.45, 0.7, p.woodDark, sx * 2.55, 0, fz + 0.1);
    k.sphere(0.5, p.leaf, sx * 2.55, 0.8, fz + 0.1, { seg: 6 });
  }
  return finish(k, 'bathroom');
}
