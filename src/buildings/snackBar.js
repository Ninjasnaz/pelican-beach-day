import { Kit, finish } from './kit.js';

// Snack bar: yellow kiosk with a burger on the roof and a patio of tables and umbrellas.
export function buildSnackBar(p) {
  const k = new Kit();
  const W = 4.6, D = 3.0, H = 2.7, bz = -2.3; // kiosk center z
  const fz = bz + D / 2;

  // kiosk
  k.box(W + 0.3, 0.14, D + 0.3, p.concrete, 0, 0, bz);
  k.box(W, H, D, p.wallYellow, 0, 0.14, bz);
  k.box(W + 0.04, 0.45, D + 0.04, p.wallRed, 0, 0.14, bz);
  k.box(W + 0.7, 0.22, D + 0.7, p.roofRed, 0, H + 0.14, bz);
  k.box(W + 0.7, 0.1, 0.1, p.white, 0, H + 0.36, fz + 0.35);

  // serving window, counter, striped awning
  k.box(2.6, 1.05, 0.1, p.shadowDark, -0.2, 1.05, fz + 0.02);
  k.box(3.0, 0.12, 0.7, p.woodLight, -0.2, 0.98, fz + 0.35);
  const n = 8, aw = 3.4 / n;
  for (let i = 0; i < n; i++) {
    const c = i % 2 ? p.white : p.wallRed, x = -0.2 - 1.7 + (i + 0.5) * aw;
    k.box(aw, 0.07, 1.3, c, x, 2.08, fz + 0.62, { rx: 0.5 });
    k.box(aw, 0.2, 0.07, c, x, 1.75, fz + 1.2);
  }
  // menu board and door
  k.box(1.0, 1.2, 0.08, p.shadowDark, 1.85, 1.0, fz + 0.04);
  for (let i = 0; i < 4; i++) k.box(0.6, 0.08, 0.03, [p.wallRed, p.white, p.wallYellow, p.signGreen][i], 1.85, 1.9 - i * 0.22, fz + 0.09);
  k.box(0.1, 1.9, 0.8, p.woodDark, -W / 2 - 0.02, 0.14, bz + 0.2);

  // burger sign on the roof
  const by = H + 0.5, bx = 0, bzz = bz;
  k.ellipsoid(0.85, 0.28, 0.85, p.boardOrange, bx, by + 0.15, bzz, { seg: 8 });
  k.cyl(0.8, 0.8, 0.14, p.cherry, bx, by + 0.34, bzz, { seg: 8 });
  k.cyl(0.88, 0.88, 0.1, p.signGreen, bx, by + 0.5, bzz, { seg: 8 });
  k.cyl(0.75, 0.75, 0.12, p.woodDark, bx, by + 0.6, bzz, { seg: 8 });
  k.ellipsoid(0.85, 0.55, 0.85, p.boardOrange, bx, by + 0.98, bzz, { seg: 8 });
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6 + 0.5;
    k.ellipsoid(0.07, 0.03, 0.04, p.scoopVanilla, bx + Math.sin(a) * 0.4, by + 1.5 - Math.abs(Math.sin(a * 1.3)) * 0.05, bzz + Math.cos(a) * 0.4 * 0.8, { seg: 4 });
  }

  // patio deck with fence
  const PZ = 1.9, PW = 7.2, PD = 4.0;
  k.box(PW, 0.12, PD, p.woodLight, 0, 0, PZ);
  for (let i = 0; i < 8; i++) k.box(PW, 0.02, 0.05, p.woodDark, 0, 0.12, PZ - PD / 2 + 0.3 + i * 0.5);
  const fzf = PZ + PD / 2 - 0.1;
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) k.box(0.1, 0.8, 0.1, p.white, sx * (1.2 + i * 0.75), 0.12, fzf);
    k.box(2.4, 0.08, 0.08, p.white, sx * 2.4, 0.8, fzf);
    k.box(0.1, 0.8, 0.1, p.white, sx * (PW / 2 - 0.1), 0.12, PZ);
    k.box(0.08, 0.08, PD - 0.2, p.white, sx * (PW / 2 - 0.1), 0.8, PZ);
  }
  // tables with umbrellas and chairs
  const tables = [[-2.4, 1.2, p.wallRed], [0.2, 2.5, p.roofBlue], [2.5, 1.2, p.boardGreen]];
  for (const [tx, tz, uc] of tables) {
    k.cyl(0.07, 0.07, 0.75, p.chrome, tx, 0.12, tz, { seg: 5 });
    k.cyl(0.55, 0.55, 0.07, p.white, tx, 0.87, tz, { seg: 10 });
    k.cyl(0.04, 0.04, 2.0, p.chrome, tx, 0.9, tz, { seg: 5 });
    k.cone(1.3, 0.55, uc, tx, 2.2, tz, { seg: 8 });
    k.cone(1.31, 0.12, p.white, tx, 2.2, tz, { seg: 8 }); // white trim ring under the colored cap
    k.sphere(0.08, p.chrome, tx, 2.8, tz, { seg: 4 });
    for (const [cx, cz] of [[-0.85, 0], [0.85, 0], [0, 0.85]]) {
      k.box(0.42, 0.06, 0.42, uc, tx + cx, 0.55, tz + cz);
      k.box(0.06, 0.45, 0.06, p.chrome, tx + cx, 0.12, tz + cz);
      const bx2 = cx === 0 ? 0 : Math.sign(cx) * 0.2, bz2 = cx === 0 ? 0.2 : 0;
      k.box(cx === 0 ? 0.42 : 0.05, 0.4, cx === 0 ? 0.05 : 0.42, uc, tx + cx + bx2, 0.58, tz + cz + bz2);
    }
  }
  // planters at the kiosk corners
  for (const sx of [-1, 1]) {
    k.box(0.8, 0.5, 0.8, p.woodDark, sx * 3.0, 0, fz + 0.8);
    k.sphere(0.5, p.leaf, sx * 3.0, 0.85, fz + 0.8, { seg: 6 });
    k.sphere(0.12, p.boardPink, sx * 3.0 + 0.2, 1.2, fz + 0.9, { seg: 4 });
  }
  return finish(k, 'snackBar');
}
