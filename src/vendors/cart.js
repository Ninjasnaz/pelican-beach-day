import * as THREE from 'three';
import { toon, mesh } from '../util/materials.js';
import { part, mergeParts, canopyWedges } from './geo.js';

// Chunky cartoon vending carts. Local frame: +Z is the customer side, the vendor
// stands at -Z. All static parts merge into one vertex-colored mesh ('body'),
// the umbrella into a second mesh flagged userData.umbrella.
const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
const cone = new THREE.ConeGeometry(1, 1, 10);
const sphere = new THREE.SphereGeometry(1, 8, 6);
const ico = new THREE.IcosahedronGeometry(1, 1);
const blob = new THREE.IcosahedronGeometry(1, 0);
const capsule = new THREE.CapsuleGeometry(1, 1, 2, 6);

const COUNTER_Y = 1.28;
const UMBRELLA = { radius: 1.85, rise: 0.6, rimY: 2.75, z: -0.5 };

// Per-type look: body color, trim/awning colors, wheel count and umbrella stripes.
const LOOKS = {
  iceCream: { body: 'cartPink', trim: 'white', sign: 'cartTeal', wheels: 2, stripes: ['cartPink', 'white'] },
  hotDog: { body: 'cartRed', trim: 'cartYellow', sign: 'cartYellow', wheels: 4, stripes: ['cartRed', 'cartYellow'] },
  lemonade: { body: 'cartYellow', trim: 'white', sign: 'cartGreen', wheels: 4, stripes: ['cartYellow', 'white'] },
  cottonCandy: { body: 'cartBlue', trim: 'cartPink', sign: 'cartPink', wheels: 2, stripes: ['cartPink', 'cartTeal'] },
  taco: { body: 'cartGreen', trim: 'cartOrange', sign: 'cartOrange', wheels: 4, stripes: ['cartOrange', 'white'] },
};

function product(type, c, y) {
  const parts = [];
  switch (type) {
    case 'iceCream': // giant cone with stacked scoops
      parts.push(part(cone, 0xe0a458, { y: y + 0.38, rx: Math.PI, sx: 0.28, sy: 0.76, sz: 0.28 }));
      parts.push(part(sphere, c.cartPink, { y: y + 0.88, s: 0.33 }));
      parts.push(part(sphere, c.cream, { y: y + 1.2, s: 0.27 }));
      parts.push(part(sphere, c.cartRed, { y: y + 1.46, s: 0.08 }));
      break;
    case 'hotDog': // bun, sausage, mustard zigzag
      parts.push(part(capsule, 0xe9b46a, { y: y + 0.28, rz: Math.PI / 2, sx: 0.26, sy: 0.42, sz: 0.26 }));
      parts.push(part(capsule, 0xc8432f, { y: y + 0.44, rz: Math.PI / 2, sx: 0.17, sy: 0.55, sz: 0.17 }));
      for (let i = 0; i < 7; i++) parts.push(part(blob, c.cartYellow, { x: -0.52 + i * 0.173, y: y + 0.6 + (i % 2) * 0.04, s: 0.06 }));
      break;
    case 'lemonade': // fat lemon with nubs and a leaf
      parts.push(part(sphere, c.lemon, { y: y + 0.5, sx: 0.62, sy: 0.46, sz: 0.46 }));
      parts.push(part(cone, c.lemon, { x: 0.66, y: y + 0.5, rz: -Math.PI / 2, sx: 0.14, sy: 0.22, sz: 0.14 }));
      parts.push(part(cone, c.lemon, { x: -0.66, y: y + 0.5, rz: Math.PI / 2, sx: 0.14, sy: 0.22, sz: 0.14 }));
      parts.push(part(sphere, c.cartGreen, { x: 0.12, y: y + 0.96, rz: 0.5, sx: 0.26, sy: 0.05, sz: 0.14 }));
      break;
    case 'cottonCandy': { // paper cone with a pink puff
      parts.push(part(cone, c.cream, { y: y + 0.36, rx: Math.PI, sx: 0.2, sy: 0.72, sz: 0.2 }));
      parts.push(part(ico, c.cartPink, { y: y + 1.02, s: 0.46 }));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        parts.push(part(ico, i % 2 ? 0x9fd8ff : c.cartPink, { x: Math.cos(a) * 0.36, y: y + 0.96 + (i % 3) * 0.1, z: Math.sin(a) * 0.36, s: 0.24 }));
      }
      break;
    }
    case 'taco': { // U-shaped shell with lettuce, tomato, cheese
      const shell = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 14, 1, true, Math.PI, Math.PI);
      shell.rotateZ(Math.PI / 2);
      parts.push(part(shell, c.taco, { y: y + 0.52 }));
      for (let i = 0; i < 6; i++) parts.push(part(ico, 0x7dd35f, { x: -0.5 + i * 0.2, y: y + 0.56 + (i % 2) * 0.05, z: (i % 2 ? 0.1 : -0.1), sx: 0.17, sy: 0.12, sz: 0.2 }));
      for (let i = 0; i < 3; i++) parts.push(part(sphere, c.cartRed, { x: -0.3 + i * 0.3, y: y + 0.62, z: 0, s: 0.1 }));
      parts.push(part(box, c.cartYellow, { x: 0.15, y: y + 0.66, z: 0.05, sx: 0.12, sy: 0.05, sz: 0.12 }));
      break;
    }
  }
  return parts;
}

export function createCart(type, palette) {
  const look = LOOKS[type];
  if (!look) throw new Error(`Unknown cart type: ${type}`);
  const c = palette;
  const bodyCol = c[look.body], trimCol = c[look.trim], signCol = c[look.sign];

  const parts = [
    // Chassis, main box, trim band, counter slab, sign board.
    part(box, 0x6b4a2b, { y: 0.45, sx: 1.7, sy: 0.14, sz: 1.1 }),
    part(box, bodyCol, { y: 0.86, sx: 1.5, sy: 0.76, sz: 1.0 }),
    part(box, trimCol, { y: 1.14, sx: 1.56, sy: 0.14, sz: 1.06 }),
    part(box, c.cream, { y: COUNTER_Y - 0.02, sx: 1.76, sy: 0.08, sz: 1.2 }),
    part(box, signCol, { y: 0.78, z: 0.52, sx: 0.78, sy: 0.3, sz: 0.04 }),
    part(box, c.white, { y: 0.78, z: 0.545, sx: 0.5, sy: 0.12, sz: 0.02 }),
  ];

  // Wheels: two big ones with a prop leg and push handle, or four small ones.
  const tire = (x, z, r) => {
    parts.push(part(cyl, c.tire, { x, y: r, z, rz: Math.PI / 2, sx: r, sy: 0.12, sz: r }));
    parts.push(part(cyl, c.rim, { x: x + Math.sign(x) * 0.02, y: r, z, rz: Math.PI / 2, sx: r * 0.55, sy: 0.14, sz: r * 0.55 }));
  };
  if (look.wheels === 2) {
    tire(-0.92, 0, 0.36);
    tire(0.92, 0, 0.36);
    parts.push(part(box, 0x6b4a2b, { x: -0.6, y: 0.25, z: 0.62, sx: 0.08, sy: 0.4, sz: 0.08 }));
    parts.push(part(box, 0x6b4a2b, { x: 0.6, y: 0.25, z: 0.62, sx: 0.08, sy: 0.4, sz: 0.08 }));
    parts.push(part(box, c.chrome, { y: 0.9, z: -0.7, sx: 1.3, sy: 0.07, sz: 0.07 }));
    parts.push(part(box, c.chrome, { x: -0.65, y: 0.7, z: -0.62, sx: 0.07, sy: 0.4, sz: 0.2 }));
    parts.push(part(box, c.chrome, { x: 0.65, y: 0.7, z: -0.62, sx: 0.07, sy: 0.4, sz: 0.2 }));
  } else {
    for (const x of [-0.78, 0.78]) for (const z of [-0.34, 0.34]) tire(x, z, 0.24);
  }

  parts.push(...product(type, c, COUNTER_Y + 0.02));
  // Umbrella pole stands behind the product, with a little finial on top.
  parts.push(part(cyl, c.chrome, { y: (UMBRELLA.rimY + 0.4) / 2 + 0.6, z: UMBRELLA.z, sx: 0.04, sy: UMBRELLA.rimY - 0.8, sz: 0.04 }));

  const group = new THREE.Group();
  group.name = `cart-${type}`;
  group.userData.type = type;
  group.userData.wheels = look.wheels;

  const body = mesh(mergeParts(parts), toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide }));
  body.name = 'cartBody';
  group.add(body);

  const [sA, sB] = look.stripes.map((k) => c[k]);
  const canopy = mesh(
    mergeParts([
      canopyWedges(UMBRELLA.radius, UMBRELLA.rise, { segments: 8, colorA: sA, colorB: sB }),
      part(sphere, c.chrome, { y: UMBRELLA.rise + 0.02, s: 0.06 }),
    ]),
    toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide }),
    { cast: true, receive: false },
  );
  canopy.name = 'umbrella';
  canopy.position.set(0, UMBRELLA.rimY, UMBRELLA.z);
  canopy.userData.umbrella = true;
  group.add(canopy);

  return group;
}
