/** Farm animals (all face +z, stand on y = 0). */
import * as THREE from 'three';
import { blob, capsule, cone, cyl, eyes, limb, quad, torus } from './kit';

const INK = '#2a221d';

export function pig(): THREE.Group {
  const c = '#f0b4c0';
  const { g, head } = quad({
    coat: c,
    hoof: '#d07a8a',
    body: [0.42, 0.36, 0.56],
    legLen: 0.2,
    legR: 0.09,
    head: { r: 0.3, y: 0.58, z: 0.6 },
  });
  head.add(cyl('#e48ea0', 0.12, 0.13, 0.1, [0, -0.04, 0.29], [Math.PI / 2, 0, 0]));
  head.add(blob(INK, 0.022, [0.045, -0.04, 0.345]), blob(INK, 0.022, [-0.045, -0.04, 0.345]));
  head.add(eyes(0.13, 0.07, 0.24, 0.04));
  for (const s of [1, -1])
    head.add(cone('#e9a0b4', 0.09, 0.16, [s * 0.17, 0.22, 0.04], [0.5, 0, s * -0.5], [1, 1, 0.5]));
  g.add(torus('#e9a0b4', 0.06, 0.022, [0, 0.62, -0.58], [0, Math.PI / 2, 0], Math.PI * 1.5));
  return g;
}

export function cow(): THREE.Group {
  const c = '#f2ece0';
  const brown = '#5a4436';
  const { g, head, bodyY } = quad({
    coat: c,
    hoof: '#4a3e38',
    body: [0.4, 0.34, 0.62],
    legLen: 0.42,
    legR: 0.085,
    head: { r: 0.26, y: 0.98, z: 0.72, s: [1, 1, 1.05] },
  });
  g.add(blob(brown, 0.18, [0.3, bodyY + 0.08, 0.05], [0.5, 0.9, 1.2]));
  g.add(blob(brown, 0.14, [-0.28, bodyY + 0.02, -0.25], [0.6, 0.9, 1]));
  g.add(blob(brown, 0.12, [0.05, bodyY + 0.3, -0.3], [1.2, 0.4, 1]));
  head.add(blob('#e9a8b0', 0.16, [0, -0.1, 0.18], [1.1, 0.8, 0.8]));
  head.add(blob(INK, 0.02, [0.06, -0.08, 0.31]), blob(INK, 0.02, [-0.06, -0.08, 0.31]));
  head.add(eyes(0.12, 0.06, 0.2, 0.035));
  head.add(blob(brown, 0.09, [0.12, 0.12, 0.12], [1, 1, 0.5]));
  for (const s of [1, -1]) {
    head.add(cone('#ece2c0', 0.04, 0.16, [s * 0.16, 0.22, 0], [0, 0, s * -0.6]));
    head.add(blob(c, 0.07, [s * 0.27, 0.05, -0.02], [1.4, 0.6, 0.4], [0, 0, s * -0.3]));
  }
  g.add(limb(c, 0.025, [0, bodyY + 0.15, -0.6], [0, bodyY - 0.25, -0.72]));
  g.add(blob(brown, 0.05, [0, bodyY - 0.3, -0.73], [1, 1.4, 1]));
  return g;
}

export function sheep(): THREE.Group {
  const wool = '#f2ece0';
  const face = '#5a4a42';
  const g = new THREE.Group();
  for (const sx of [1, -1])
    for (const sz of [1, -1]) g.add(limb(face, 0.06, [sx * 0.2, 0.45, sz * 0.3], [sx * 0.2, 0.06, sz * 0.3]));
  const puffs: [number, number, number, number][] = [
    [0, 0.62, 0, 0.36],
    [0.22, 0.7, 0.2, 0.22],
    [-0.22, 0.7, 0.2, 0.22],
    [0.22, 0.7, -0.22, 0.22],
    [-0.22, 0.7, -0.22, 0.22],
    [0, 0.86, 0.05, 0.24],
    [0, 0.82, -0.28, 0.2],
    [0, 0.6, 0.36, 0.2],
    [0.3, 0.55, 0, 0.2],
    [-0.3, 0.55, 0, 0.2],
    [0, 0.6, -0.4, 0.18],
  ];
  for (const [x, y, z, r] of puffs) g.add(blob(wool, r, [x, y, z]));
  const head = new THREE.Group();
  head.position.set(0, 0.78, 0.48);
  head.add(blob(face, 0.17, [0, 0, 0], [0.85, 1, 1.15]));
  head.add(blob(wool, 0.11, [0, 0.15, -0.02], [1.3, 0.8, 1.1]));
  head.add(eyes(0.09, 0.03, 0.12, 0.03));
  for (const s of [1, -1])
    head.add(blob(face, 0.06, [s * 0.17, 0.02, -0.02], [1.5, 0.5, 0.6], [0, 0, s * 0.4]));
  g.add(head);
  return g;
}

export function goat(): THREE.Group {
  const c = '#ece6da';
  const { g, head, bodyY } = quad({
    coat: c,
    hoof: '#6a6460',
    body: [0.3, 0.28, 0.48],
    legLen: 0.38,
    legR: 0.065,
    head: { r: 0.2, y: 0.95, z: 0.55, s: [0.9, 1, 1.15] },
    neck: true,
  });
  head.add(eyes(0.1, 0.05, 0.13, 0.03));
  head.add(cone('#d9d0bc', 0.05, 0.14, [0, -0.2, 0.12], [Math.PI, 0, 0]));
  head.add(blob('#d9d0bc', 0.07, [0, -0.06, 0.2], [1, 0.8, 0.8]));
  for (const s of [1, -1]) {
    head.add(torus('#b9b3a8', 0.14, 0.03, [s * 0.08, 0.16, -0.12], [0, Math.PI / 2, 0], Math.PI * 0.9));
    head.add(blob(c, 0.06, [s * 0.2, 0.05, -0.03], [1.6, 0.5, 0.5], [0, 0, s * -0.3]));
  }
  g.add(cone(c, 0.06, 0.14, [0, bodyY + 0.2, -0.5], [-0.9, 0, 0]));
  return g;
}

export function equine(coat: string, mane: string, longEars = false, muzzle = '#d9c0a0'): THREE.Group {
  const { g, head, bodyY } = quad({
    coat,
    hoof: '#3a3028',
    body: [0.32, 0.3, 0.6],
    legLen: 0.6,
    legR: 0.07,
    head: { r: 0.2, y: 1.42, z: 0.78, s: [0.85, 1, 1.4] },
    neck: true,
  });
  head.rotation.x = 0.5;
  head.add(blob(muzzle, 0.13, [0, -0.06, 0.24], [0.95, 0.8, 0.9]));
  head.add(blob(INK, 0.018, [0.05, -0.04, 0.35]), blob(INK, 0.018, [-0.05, -0.04, 0.35]));
  head.add(eyes(0.14, 0.06, 0.06, 0.032));
  const el = longEars ? 0.22 : 0.1;
  for (const s of [1, -1])
    head.add(capsule(coat, 0.035, el, [s * 0.08, 0.2 + el / 2, -0.1], [1.2, 1, 0.6], [-0.3, 0, s * -0.25]));
  for (let k = 0; k < 6; k++) {
    const t = k / 5;
    g.add(blob(mane, 0.07, [0, bodyY + 0.42 + t * 0.5, 0.42 + t * 0.32], [0.6, 1, 1]));
  }
  g.add(limb(mane, 0.06, [0, bodyY + 0.15, -0.6], [0, bodyY - 0.45, -0.78], [1.2, 1, 1]));
  return g;
}

export function llama(): THREE.Group {
  const c = '#ece2c8';
  const { g, head, bodyY } = quad({
    coat: c,
    hoof: '#6a5a4a',
    body: [0.3, 0.28, 0.46],
    legLen: 0.45,
    legR: 0.07,
    head: { r: 0.17, y: 1.55, z: 0.42, s: [0.9, 1, 1.2] },
  });
  g.add(limb(c, 0.12, [0, bodyY + 0.15, 0.35], [0, 1.5, 0.4]));
  head.add(blob('#d9c8a8', 0.09, [0, -0.06, 0.17], [1, 0.8, 0.8]));
  head.add(eyes(0.1, 0.04, 0.1, 0.03));
  for (const s of [1, -1])
    head.add(capsule(c, 0.035, 0.14, [s * 0.08, 0.2, -0.04], [1, 1, 0.7], [-0.2, 0, s * -0.15]));
  g.add(blob('#c0533a', 1, [0, bodyY + 0.2, -0.02], [0.33, 0.12, 0.36]));
  g.add(blob('#e8c45a', 1, [0, bodyY + 0.23, -0.02], [0.2, 0.1, 0.22]));
  g.add(blob(c, 0.08, [0, bodyY + 0.1, -0.48]));
  return g;
}

export function camel(): THREE.Group {
  const c = '#d8b47a';
  const { g, head, bodyY } = quad({
    coat: c,
    hoof: '#8a6a44',
    body: [0.3, 0.26, 0.56],
    legLen: 0.62,
    legR: 0.07,
    head: { r: 0.15, y: 1.12, z: 0.95, s: [0.9, 0.9, 1.4] },
  });
  g.add(blob(c, 0.24, [0, bodyY + 0.28, -0.05], [0.9, 1, 1.1]));
  g.add(limb(c, 0.09, [0, bodyY + 0.05, 0.5], [0, bodyY + 0.02, 0.85]));
  g.add(limb(c, 0.085, [0, bodyY + 0.02, 0.85], [0, 1.1, 0.88]));
  head.add(eyes(0.09, 0.04, 0.08, 0.026));
  head.add(blob('#c8a068', 0.08, [0, -0.04, 0.17], [1, 0.8, 0.9]));
  for (const s of [1, -1]) head.add(blob(c, 0.04, [s * 0.1, 0.1, -0.08], [1, 1.4, 0.6]));
  return g;
}

export function chicken(): THREE.Group {
  const g = new THREE.Group();
  const white = '#f6f1e6';
  for (const s of [1, -1]) {
    g.add(limb('#e8b04a', 0.022, [s * 0.08, 0.3, 0], [s * 0.08, 0.03, 0.02]));
    g.add(blob('#e8b04a', 0.05, [s * 0.08, 0.02, 0.06], [0.8, 0.3, 1.4]));
  }
  g.add(blob(white, 0.26, [0, 0.42, -0.02], [0.9, 0.85, 1.15]));
  g.add(blob('#ece6da', 0.14, [0, 0.58, -0.3], [0.5, 1.3, 0.8], [-0.5, 0, 0]));
  for (const s of [1, -1]) g.add(blob('#e2ddd4', 0.13, [s * 0.22, 0.44, -0.04], [0.35, 0.8, 1.2]));
  const head = new THREE.Group();
  head.position.set(0, 0.76, 0.2);
  head.add(blob(white, 0.15));
  head.add(eyes(0.08, 0.03, 0.11, 0.025));
  head.add(cone('#e8b04a', 0.04, 0.09, [0, -0.01, 0.17], [Math.PI / 2, 0, 0]));
  head.add(blob('#d8573c', 0.035, [0, -0.08, 0.13], [0.6, 1.3, 0.7]));
  for (let k = 0; k < 3; k++)
    head.add(blob('#d8573c', 0.04, [0, 0.15 + (k === 1 ? 0.02 : 0), 0.06 - k * 0.06]));
  g.add(head);
  return g;
}
