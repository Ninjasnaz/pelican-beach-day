import { Kit, finish } from './kit.js';

// Ice cream shop: pink kiosk, striped awning, giant cone on the roof.
export function buildIceCream(p) {
  const k = new Kit();
  const W = 3.8, D = 3.0, H = 2.5, fz = D / 2;

  k.box(W + 0.3, 0.12, D + 0.3, p.concrete, 0, 0, 0);
  k.box(W, H, D, p.wallPink, 0, 0.12, 0);
  k.box(W + 0.05, 0.5, D + 0.05, p.wallCream, 0, 0.12, 0); // skirt band
  k.box(W + 0.5, 0.2, D + 0.5, p.white, 0, H + 0.12, 0); // roof slab

  // scalloped frosting trim around the roof edge
  for (let i = 0; i < 8; i++) {
    const x = -W / 2 - 0.1 + (i + 0.5) * ((W + 0.2) / 8);
    k.sphere(0.2, p.white, x, H + 0.1, fz + 0.28, { sy: 0.9, seg: 6 });
  }

  // serving window with counter and menu strip
  k.box(2.3, 1.05, 0.1, p.glass, 0, 1.0, fz + 0.03);
  k.box(2.6, 0.12, 0.65, p.woodLight, 0, 0.95, fz + 0.3);
  k.box(0.12, 1.2, 0.1, p.white, -1.25, 0.95, fz + 0.04);
  k.box(0.12, 1.2, 0.1, p.white, 1.25, 0.95, fz + 0.04);
  // little sundae glass on the counter
  k.cone(0.14, 0.2, p.glass, 0.8, 1.07, fz + 0.3, { seg: 6, rx: Math.PI });
  k.sphere(0.12, p.scoopPink, 0.8, 1.34, fz + 0.3, { seg: 6 });
  k.sphere(0.12, p.scoopMint, 0.45, 1.2, fz + 0.3, { seg: 6 });

  // striped awning over the window
  const n = 8, aw = (W + 0.3) / n, tilt = 0.5, len = 1.3;
  for (let i = 0; i < n; i++) {
    const c = i % 2 ? p.white : p.scoopPink;
    const x = -(W + 0.3) / 2 + (i + 0.5) * aw;
    k.box(aw, 0.07, len, c, x, 2.06, fz + 0.6, { rx: tilt });
    k.box(aw, 0.22, 0.07, c, x, 1.74, fz + 1.17);
  }

  // side door and flavor board
  k.box(0.1, 1.9, 0.9, p.woodDark, W / 2 + 0.02, 0.12, -0.3);
  k.box(1.1, 1.3, 0.1, p.shadowDark, 1.75, 0.45, fz + 1.6, { rx: -0.1 });
  for (let i = 0; i < 4; i++) k.box(0.7, 0.14, 0.04, [p.scoopPink, p.scoopMint, p.scoopVanilla, p.boardOrange][i], 1.75, 0.75 + i * 0.2, fz + 1.66, { rx: -0.1 });
  k.box(0.08, 0.5, 0.08, p.woodDark, 1.35, 0, fz + 1.55);
  k.box(0.08, 0.5, 0.08, p.woodDark, 2.15, 0, fz + 1.55);

  // the big cone on the roof (points down) with three scoops and a cherry
  const ry = H + 0.32;
  k.cone(0.62, 1.7, p.coneWaffle, 0, ry, -0.1, { rx: Math.PI, seg: 8 });
  k.cyl(0.7, 0.7, 0.14, p.scoopVanilla, 0, ry + 1.7, -0.1, { seg: 10 });
  k.sphere(0.78, p.scoopPink, 0, ry + 2.1, -0.1, { seg: 9 });
  k.sphere(0.62, p.scoopMint, 0, ry + 2.75, -0.1, { seg: 9 });
  k.sphere(0.18, p.cherry, 0, ry + 3.35, -0.1, { seg: 6 });
  return finish(k, 'iceCream');
}
