import { Kit, finish } from './kit.js';
import { mesh, toon } from '../util/materials.js';

// Beach club: gabled hall with a wide wrap-style porch and a flag on the peak.
export function buildClubhouse(p) {
  const k = new Kit();
  const BW = 6.4, BD = 5.0, WH = 3.2, bz = -1.5; // body width, depth, wall height, center z
  const front = bz + BD / 2; // z of the front wall

  // body + corner trim
  k.box(BW, WH, BD, p.wallCream, 0, 0.1, bz);
  for (const sx of [-1, 1]) k.box(0.25, WH, 0.25, p.white, sx * (BW / 2), 0.1, front);
  // gable roof (ridge runs front to back) and gable-face details
  k.prism(BW + 1.0, 2.7, BD + 1.0, p.roofBlue, 0, WH + 0.1, bz);
  k.prism(BW * 0.85, 2.0, 0.12, p.wallCream, 0, WH + 0.1, front + 0.5);
  const cy = WH + 0.85; // round window center
  k.cyl(0.62, 0.62, 0.1, p.glass, 0, cy - 0.05, front + 0.53, { rx: Math.PI / 2, seg: 10 });
  k.torus(0.66, 0.08, p.white, 0, cy, front + 0.56, { seg: 10 });
  k.box(0.1, 1.2, 0.06, p.white, 0, cy - 0.6, front + 0.6);
  k.box(1.2, 0.1, 0.06, p.white, 0, cy - 0.05, front + 0.6);
  // chimney
  k.box(0.7, 2.2, 0.7, p.wallRed, -2.2, WH + 0.2, bz - 0.8);
  k.box(0.9, 0.15, 0.9, p.concrete, -2.2, WH + 2.35, bz - 0.8);

  // door and windows with shutters
  k.box(1.3, 2.3, 0.12, p.woodDark, 0, 0.45, front + 0.05);
  k.box(0.9, 0.7, 0.14, p.glass, 0, 1.65, front + 0.06);
  for (const sx of [-1, 1]) {
    k.box(1.3, 1.1, 0.1, p.glass, sx * 2.2, 1.3, front + 0.05);
    k.box(1.4, 0.1, 0.14, p.white, sx * 2.2, 1.2, front + 0.07);
    k.box(0.34, 1.2, 0.1, p.roofBlue, sx * 2.2 - 0.9, 1.25, front + 0.06);
    k.box(0.34, 1.2, 0.1, p.roofBlue, sx * 2.2 + 0.9, 1.25, front + 0.06);
  }

  // wide porch
  const PW = 9.2, PD = 2.8, pz = front + PD / 2;
  k.box(PW, 0.35, PD, p.woodLight, 0, 0, pz);
  for (let i = 0; i < 6; i++) k.box(PW, 0.02, 0.05, p.woodDark, 0, 0.35, front + 0.45 + i * 0.45); // plank lines
  k.box(PW + 0.6, 0.16, PD + 0.5, p.roofRed, 0, 3.0, pz + 0.1, { rx: 0.14 });
  for (const x of [-4.4, -2.2, 0, 2.2, 4.4]) k.box(0.22, 2.7, 0.22, p.white, x, 0.35, front + PD - 0.2);
  for (const sx of [-1, 1]) {
    // railings at both ends, with a gap in the middle for the steps
    for (const x of [sx * 3.3, sx * 1.65]) k.box(1.5, 0.1, 0.1, p.white, x, 1.1, front + PD - 0.2);
    for (const x of [sx * 3.7, sx * 2.9, sx * 2.1, sx * 1.3]) k.box(0.08, 0.75, 0.08, p.white, x, 0.35, front + PD - 0.2);
  }
  // steps
  k.box(2.4, 0.18, 0.55, p.woodLight, 0, 0, front + PD + 0.2);
  k.box(2.4, 0.18, 0.4, p.woodDark, 0, 0.0, front + PD + 0.55);
  // club sign hung under the porch roof: panel with a little sailboat
  k.box(2.6, 0.75, 0.08, p.wallYellow, 0, 2.15, front + PD - 0.25);
  k.prism(0.5, 0.55, 0.05, p.white, -0.25, 2.2, front + PD - 0.18);
  k.prism(0.35, 0.45, 0.05, p.roofRed, 0.2, 2.2, front + PD - 0.18);
  k.box(0.9, 0.1, 0.05, p.roofBlue, 0, 2.15, front + PD - 0.18);
  // porch furniture: bench and a barrel planter
  k.box(1.6, 0.1, 0.4, p.woodDark, -3.1, 0.6, front + 1.3);
  k.box(0.08, 0.6, 0.35, p.woodDark, -3.8, 0.35, front + 1.3);
  k.box(0.08, 0.6, 0.35, p.woodDark, -2.4, 0.35, front + 1.3);
  k.cyl(0.4, 0.34, 0.55, p.woodDark, 3.2, 0.35, front + 1.3);
  k.sphere(0.45, p.leafLight, 3.2, 1.1, front + 1.3, { seg: 6 });
  // flagpole on the roof peak
  const poleX = 0, poleZ = front + 0.2, poleY = WH + 0.1 + 2.6;
  k.cyl(0.06, 0.07, 3.0, p.chrome, poleX, poleY - 0.4, poleZ, { seg: 5 });
  k.sphere(0.12, p.rim, poleX, poleY + 2.65, poleZ, { seg: 5 });

  const root = finish(k, 'clubhouse');
  // flag (own mesh so it can wave): three stripes hung from the pole
  const fk = new Kit();
  fk.box(1.5, 0.28, 0.05, p.wallTeal, 0.75, 0.56, 0);
  fk.box(1.5, 0.28, 0.05, p.white, 0.75, 0.28, 0);
  fk.box(1.5, 0.28, 0.05, p.boardOrange, 0.75, 0.0, 0);
  const flag = mesh(fk.build().geometry, toon(0xffffff, { vertexColors: true }), { receive: false });
  const inner = root.userData.inner;
  // The flag hangs from the top of the pole; express it in the shifted inner frame.
  flag.position.set(poleX + 0.06, poleY + 1.8, poleZ);
  inner.add(flag);
  root.userData.flag = flag;
  return root;
}
