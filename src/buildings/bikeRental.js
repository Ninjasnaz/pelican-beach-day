import { Kit, finish, addBike, lineXY } from './kit.js';

// Bike rental: blue shop under a white canopy, bikes racked out front, big bicycle sign.
export function buildBikeRental(p) {
  const k = new Kit();
  const W = 4.2, D = 2.4, H = 2.6, bz = -1.8; // shop body
  const fz = bz + D / 2;

  k.box(W + 0.6, 0.12, D + 3.4, p.concrete, 0, 0, bz + 0.5); // slab under shop and rack
  k.box(W, H, D, p.wallBlue, 0, 0.12, bz);
  k.box(W + 0.05, 0.4, D + 0.05, p.roofBlue, 0, 0.12, bz);

  // canopy over the rack
  const cd = 4.4, cz = -0.8, rf = cz + cd / 2;
  k.box(W + 0.8, 0.18, cd, p.white, 0, H + 0.12, cz, { rx: 0.05 });
  k.box(W + 0.8, 0.12, 0.12, p.wallRed, 0, H + 0.1, rf);
  for (const sx of [-1, 1]) k.box(0.14, H, 0.14, p.white, sx * (W / 2 + 0.2), 0.12, rf - 0.15);

  // door, window, helmet pegs
  k.box(1.0, 2.0, 0.08, p.shadowDark, -1.2, 0.12, fz + 0.03);
  k.box(0.9, 0.9, 0.08, p.glass, 1.3, 1.0, fz + 0.03);
  k.box(1.1, 0.08, 0.14, p.white, 1.3, 0.95, fz + 0.06);
  [[p.wallRed, 0.2], [p.boardYellow, 0.8], [p.signGreen, 1.4], [p.boardOrange, 2.0]].forEach(([c, dx], i) => {
    k.sphere(0.18, c, -0.3 + dx * 0.5, 1.9, fz + 0.15, { sy: 0.8, seg: 6 });
    k.box(0.04, 0.2, 0.04, p.chrome, -0.3 + dx * 0.5, 1.6 + 0.0 * i, fz + 0.05);
  });

  // big bicycle sign standing on the canopy front
  const sz = rf - 0.2, sy = H + 0.3;
  k.box(3.4, 1.5, 0.16, p.wallYellow, 0, sy, sz);
  k.box(3.5, 0.12, 0.2, p.wallRed, 0, sy + 1.5, sz);
  k.box(3.5, 0.12, 0.2, p.wallRed, 0, sy - 0.05, sz);
  // bicycle icon: ring wheels plus frame lines
  const by = sy + 0.62, bzi = sz + 0.1, T = p.shadowDark;
  for (const sx of [-0.85, 0.85]) {
    k.torus(0.42, 0.07, T, sx, by, bzi, { seg: 10 });
    k.sphere(0.07, T, sx, by, bzi, { seg: 4 });
  }
  const rear = [-0.85, by], front = [0.85, by], bb = [-0.1, by - 0.02], seat = [-0.5, by + 0.62], head = [0.6, by + 0.6];
  for (const [a, b] of [[rear, bb], [bb, seat], [seat, rear], [bb, head], [seat, head], [head, front]]) lineXY(k, a, b, 0.09, p.wallBlue, bzi);
  k.box(0.5, 0.09, 0.07, p.wallRed, seat[0] - 0.05, seat[1] + 0.02, bzi);
  k.box(0.1, 0.4, 0.07, p.wallRed, head[0] + 0.02, head[1] + 0.02, bzi);

  // racked bikes (side by side, facing +z) with a wheel rail
  const colors = [p.wallRed, p.boardYellow, p.signGreen, p.boardOrange, p.purple];
  const rz = fz + 0.95;
  colors.forEach((c, i) => addBike(k, -1.65 + i * 0.85, rz, 0.75, c, p, 0.12));
  return finish(k, 'bikeRental');
}
