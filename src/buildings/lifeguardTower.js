import { Kit, finish } from './kit.js';

// Raised lifeguard hut on stilts: ladder, red cross panels, lookout window.
export function buildLifeguardTower(p) {
  const k = new Kit();
  const SH = 2.4, DK = 2.8; // stilt height, deck size
  const h = DK / 2 - 0.2;

  // stilts with X bracing on the front/back and sides
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.22, SH + 0.1, 0.22, p.woodDark, sx * h, 0, sz * h);
  for (const sz of [-1, 1]) for (const a of [0.78, -0.78]) k.box(0.1, 2.9, 0.08, p.woodLight, 0, -0.25, sz * h, { rz: a });
  for (const sx of [-1, 1]) for (const a of [0.78, -0.78]) k.box(0.08, 2.9, 0.1, p.woodLight, sx * h, -0.25, 0, { rx: a });

  // deck and railing
  k.box(DK, 0.18, DK, p.woodLight, 0, SH, 0);
  const rail = SH + 0.18, e = DK / 2 - 0.08;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.1, 0.95, 0.1, p.white, sx * e, rail, sz * e);
  k.box(DK, 0.08, 0.08, p.white, 0, rail + 0.9, -e);
  k.box(0.08, 0.08, DK, p.white, -e, rail + 0.9, 0);
  k.box(0.08, 0.08, DK, p.white, e, rail + 0.9, 0);
  for (const sx of [-0.95, 0.95]) k.box(0.95, 0.08, 0.08, p.white, sx, rail + 0.9, e); // front rail, gap at the ladder

  // the hut
  const HW = 2.0, HH = 1.75, hy = SH + 0.18, hz = -0.2;
  k.box(HW, HH, HW, p.white, 0, hy, hz);
  k.box(HW + 0.04, 0.4, HW + 0.04, p.lifeRed, 0, hy, hz); // red band
  k.box(HW + 0.7, 0.2, HW + 0.7, p.lifeRed, 0, hy + HH, hz, { rx: 0.1 }); // roof, tilted forward
  const fz = hz + HW / 2 + 0.03; // front wall
  k.box(1.0, 0.8, 0.06, p.glass, -0.42, hy + 0.7, fz); // lookout window
  k.box(1.15, 0.07, 0.1, p.white, -0.42, hy + 0.65, fz + 0.02);
  cross(k, p, 0.5, hy + 0.7, fz, 0.7, 0);
  cross(k, p, 0, hy + 0.6, hz - HW / 2 - 0.03, 0.8, 0); // back
  for (const s of [-1, 1]) {
    cross(k, p, s * (HW / 2 + 0.03), hy + 0.6, hz - 0.4, 0.7, s * Math.PI / 2);
    k.box(0.06, 0.7, 0.8, p.glass, s * (HW / 2 + 0.02), hy + 0.7, hz + 0.45);
  }

  // ladder up the front, leaning slightly
  const lt = 0.11, zc = DK / 2 + 0.35, L = SH + 0.6;
  for (const sx of [-0.4, 0.4]) k.box(0.08, L, 0.08, p.woodDark, sx, 0, zc, { rx: -lt });
  for (let i = 0; i < 7; i++) {
    const y = 0.3 + i * 0.36;
    k.box(0.8, 0.06, 0.08, p.woodLight, 0, y, zc - (y - L / 2) * Math.sin(lt));
  }
  k.box(1.3, 0.14, 0.7, p.woodDark, 0, 0, zc + 0.1); // step block at the foot

  // flag on a pole at the back corner + life ring on the front rail
  const px = DK / 2 - 0.3, pz = -DK / 2 + 0.3;
  k.cyl(0.04, 0.04, 2.3, p.chrome, px, hy + HH, pz, { seg: 5 });
  k.box(0.9, 0.5, 0.04, p.lifeRed, px - 0.47, hy + HH + 1.75, pz);
  k.box(0.35, 0.25, 0.05, p.white, px - 0.35, hy + HH + 1.87, pz);
  k.torus(0.28, 0.08, p.lifeRed, 0.95, rail + 0.55, e + 0.07, { seg: 8 });
  for (const dx of [-0.28, 0.28]) k.box(0.1, 0.12, 0.05, p.white, 0.95 + dx, rail + 0.55, e + 0.07);
  return finish(k, 'lifeguardTower');
}

// Red cross on a white square, rotated `ry` about y to face a wall.
function cross(k, p, x, y, z, s, ry) {
  k.box(s, s, 0.05, p.white, x, y, z, { ry });
  const dx = Math.sin(ry) * 0.03, dz = Math.cos(ry) * 0.03;
  k.box(s * 0.7, s * 0.22, 0.05, p.lifeRed, x + dx, y + s * 0.39, z + dz, { ry });
  k.box(s * 0.22, s * 0.7, 0.05, p.lifeRed, x + dx, y + s * 0.15, z + dz, { ry });
}
