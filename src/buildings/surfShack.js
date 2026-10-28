import { Kit, finish } from './kit.js';

// Surf rental shack: turquoise plank hut, raised hatch awning, boards leaning everywhere.
export function buildSurfShack(p) {
  const k = new Kit();
  const W = 4.0, D = 3.0, H = 2.6, fz = D / 2;

  k.box(W + 0.4, 0.14, D + 0.4, p.woodLight, 0, 0, 0); // deck
  k.box(W, H, D, p.wallTeal, 0, 0.14, 0);
  for (let i = 0; i < 5; i++) k.box(W + 0.02, 0.05, D + 0.02, p.roofTeal, 0, 0.5 + i * 0.5, 0); // plank lines
  for (const sx of [-1, 1]) k.box(0.2, H, 0.2, p.woodDark, sx * (W / 2), 0.14, fz); // corner posts
  // sloped yellow roof
  k.box(W + 0.9, 0.2, D + 1.1, p.boardYellow, 0, H + 0.1, 0.05, { rx: 0.1 });
  k.box(W + 0.9, 0.12, 0.12, p.boardOrange, 0, H + 0.1, fz + 0.5);

  // hatch window with a raised flap awning and a counter
  const hx = -0.4;
  k.box(2.2, 1.0, 0.1, p.shadowDark, hx, 1.05, fz + 0.02);
  k.box(2.6, 0.1, 0.6, p.woodDark, hx, 0.98, fz + 0.3);
  k.box(2.5, 0.08, 1.1, p.boardOrange, hx, 2.12, fz + 0.65, { rx: -0.45 });
  for (const sx of [-1, 1]) k.box(0.05, 1.3, 0.05, p.woodDark, hx + sx * 1.15, 1.05, fz + 1.1, { rx: -0.15 });
  // little shop-keeper things: sunglasses sign, tide chart
  k.box(0.7, 0.5, 0.06, p.white, hx + 1.9, 1.5, fz + 0.03);
  k.box(0.5, 0.1, 0.07, p.boardBlue, hx + 1.9, 1.7, fz + 0.04);

  // boards leaning on the wall either side of the hatch
  const wallBoards = [[-1.75, p.boardPink, p.white], [-1.25, p.boardBlue, p.white], [1.1, p.boardGreen, p.wallCream], [1.6, p.boardOrange, p.white]];
  for (const [x, c, stripe] of wallBoards) board(k, p, x, fz + 0.05 + 2.3 * Math.sin(0.14), 0.14, 2.3, 0.14, c, stripe);

  // freestanding rack with five boards leaning on its bar
  const rz = 1.2;
  for (const x of [2.5, 5.1]) k.box(0.14, 1.75, 0.14, p.woodDark, x, 0, rz);
  k.box(2.9, 0.14, 0.14, p.woodDark, 3.8, 1.63, rz);
  const cols = [p.boardYellow, p.boardPink, p.boardBlue, p.boardOrange, p.boardGreen];
  cols.forEach((c, i) => board(k, p, 2.9 + i * 0.5, rz + 0.1 + 1.5 * Math.tan(0.28), 0.14, 2.2, 0.28, c, i % 2 ? p.white : p.shadowDark));

  // board sticking up from the roof as a sign, plus barrel and bucket
  board(k, p, -1.3, -0.9, H + 0.2, 1.9, 0.2, p.boardPink, p.white);
  k.cyl(0.35, 0.3, 0.7, p.woodDark, -3.0, 0.14, 1.4);
  k.cyl(0.36, 0.36, 0.06, p.boardBlue, -3.0, 0.82, 1.4);
  k.cyl(0.18, 0.14, 0.3, p.boardBlue, -2.5, 0.14, 2.1);
  // palm sprig by the corner
  k.cyl(0.07, 0.1, 2.4, p.woodDark, -2.6, 0.14, 0.2, { seg: 5 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.box(0.14, 0.05, 1.3, p.leaf, -2.6 + Math.sin(a) * 0.55, 2.4, 0.2 + Math.cos(a) * 0.55, { ry: a, rx: 0.45 });
  }
  return finish(k, 'surfShack');
}

// Surfboard: flat ellipsoid with a stripe and a fin, standing on `y0` at `zBottom`,
// tilted back by `tilt` radians.
function board(k, p, x, zBottom, y0, len, tilt, color, stripe) {
  const zc = zBottom - (len / 2) * Math.sin(tilt), yc = y0 + (len / 2) * Math.cos(tilt);
  k.ellipsoid(0.27, len / 2, 0.04, color, x, yc, zc, { rx: -tilt, seg: 8 });
  k.ellipsoid(0.07, len / 2 - 0.05, 0.045, stripe, x, yc, zc + 0.01, { rx: -tilt, seg: 6 });
  k.box(0.04, 0.3, 0.22, p.shadowDark, x, y0 + 0.02, zBottom + 0.02);
}
