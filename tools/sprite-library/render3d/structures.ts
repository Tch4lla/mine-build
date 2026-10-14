/** Structures as small 3D dioramas on a base slab (front toward +z). */
import * as THREE from 'three';
import { blob, cone, cyl, limb, rbox, toon, type V3 } from './kit';

function base(color: string, w = 2.2, d = 2.2): THREE.Mesh {
  return rbox(color, w, 0.14, d, 0.06, [0, 0.07, 0]);
}

/** A triangular-prism roof: ridge along x. */
function gable(color: string, w: number, d: number, h: number, p: V3): THREE.Mesh {
  const s = new THREE.Shape();
  s.moveTo(-d / 2 - 0.06, 0);
  s.lineTo(d / 2 + 0.06, 0);
  s.lineTo(0, h);
  s.lineTo(-d / 2 - 0.06, 0);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: w + 0.1,
    bevelEnabled: true,
    bevelSize: 0.02,
    bevelThickness: 0.02,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -(w + 0.1) / 2);
  geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, toon(color));
  m.position.set(...p);
  return m;
}

function pyramid(color: string, r: number, h: number, p: V3): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 4), toon(color));
  m.position.set(...p);
  m.rotation.y = Math.PI / 4;
  return m;
}

interface HouseSpec {
  wall: string;
  roof: string;
  trim?: string;
  w?: number;
  d?: number;
  h?: number;
  roofType?: 'gable' | 'pyramid' | 'flat';
  snow?: boolean;
}

function house(x: number, z: number, o: HouseSpec, rotY = 0): THREE.Group {
  const g = new THREE.Group();
  const w = o.w ?? 0.7;
  const d = o.d ?? 0.6;
  const h = o.h ?? 0.5;
  g.add(rbox(o.wall, w, h, d, 0.04, [0, 0.14 + h / 2, 0]));
  if (o.trim)
    for (const sx of [1, -1])
      for (const sz of [1, -1])
        g.add(rbox(o.trim, 0.08, h, 0.08, 0.02, [(sx * w) / 2, 0.14 + h / 2, (sz * d) / 2]));
  g.add(rbox('#3a2e26', 0.16, 0.26, 0.03, 0.02, [0, 0.14 + 0.13, d / 2 + 0.01]));
  for (const sx of [1, -1])
    g.add(rbox('#bcd8dc', 0.12, 0.12, 0.03, 0.02, [sx * w * 0.3, 0.14 + h * 0.62, d / 2 + 0.01]));
  const top = 0.14 + h;
  const rt = o.roofType ?? 'gable';
  if (rt === 'gable') g.add(gable(o.roof, w, d, 0.34, [0, top, 0]));
  else if (rt === 'pyramid') g.add(pyramid(o.roof, Math.max(w, d) * 0.78, 0.42, [0, top + 0.21, 0]));
  else g.add(rbox(o.roof, w + 0.08, 0.08, d + 0.08, 0.03, [0, top + 0.04, 0]));
  if (o.snow && rt === 'gable') g.add(gable('#fbf8f0', w * 0.98, d * 0.98, 0.3, [0, top + 0.07, 0]));
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

function tree(
  x: number,
  z: number,
  leaf: string,
  trunk = '#6e5440',
  kind: 'round' | 'pine' | 'flat' = 'round',
  snow = false,
): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(trunk, 0.05, 0.06, 0.4, [0, 0.34, 0]));
  if (kind === 'pine') {
    for (let k = 0; k < 3; k++) {
      g.add(cone(leaf, 0.3 - k * 0.07, 0.32, [0, 0.55 + k * 0.2, 0]));
      if (snow) g.add(cone('#fbf8f0', 0.16 - k * 0.04, 0.12, [0, 0.67 + k * 0.2, 0]));
    }
  } else if (kind === 'flat') {
    g.add(limb(trunk, 0.04, [0, 0.5, 0], [0.12, 0.7, 0]));
    g.add(blob(leaf, 0.34, [0.1, 0.78, 0], [1, 0.3, 1]));
  } else {
    g.add(blob(leaf, 0.24, [0, 0.66, 0]));
    g.add(blob(leaf, 0.17, [0.14, 0.56, 0.08]));
  }
  g.position.set(x, 0, z);
  return g;
}

function path(color: string, pts: [number, number][]): THREE.Group {
  const g = new THREE.Group();
  for (const [x, z] of pts) g.add(rbox(color, 0.26, 0.03, 0.26, 0.03, [x, 0.15, z]));
  return g;
}

function well(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl('#a9a59c', 0.18, 0.19, 0.2, [0, 0.24, 0]));
  g.add(cyl('#5d8fa8', 0.13, 0.13, 0.02, [0, 0.335, 0]));
  for (const s of [1, -1]) g.add(rbox('#8a6544', 0.04, 0.34, 0.04, 0.01, [s * 0.16, 0.48, 0]));
  g.add(gable('#c0533a', 0.42, 0.34, 0.12, [0, 0.64, 0]));
  g.position.set(x, 0, z);
  return g;
}

function chest(x: number, z: number, y = 0.14, rotY = 0): THREE.Group {
  const g = new THREE.Group();
  g.add(rbox('#b07a4a', 0.28, 0.22, 0.2, 0.03, [0, y + 0.11, 0]));
  g.add(rbox('#5a4a3a', 0.29, 0.025, 0.21, 0.01, [0, y + 0.15, 0]));
  g.add(rbox('#d9c088', 0.05, 0.06, 0.02, 0.01, [0, y + 0.13, 0.11]));
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

// --- villages -------------------------------------------------------------------------------------

function village(
  ground: string,
  pathC: string,
  a: HouseSpec,
  b: HouseSpec,
  treeFn: (x: number, z: number) => THREE.Object3D,
  extra?: THREE.Object3D,
): THREE.Group {
  const g = new THREE.Group();
  g.add(base(ground));
  g.add(
    path(pathC, [
      [0, 0.95],
      [0, 0.7],
      [0, 0.45],
      [0, 0.2],
      [0.25, 0.2],
      [-0.25, 0.2],
    ]),
  );
  g.add(house(-0.55, -0.45, a, 0.25));
  g.add(house(0.6, -0.3, b, -0.3));
  g.add(treeFn(-0.75, 0.6));
  if (extra) g.add(extra);
  return g;
}

export const villageMeadow = (): THREE.Group =>
  village(
    '#9db58a',
    '#b8a07a',
    { wall: '#efe4cc', roof: '#c0533a', trim: '#8a6544' },
    { wall: '#c9a57a', roof: '#8a4a3a', w: 0.6, d: 0.55 },
    (x, z) => tree(x, z, '#78a37e'),
    well(0.55, 0.55),
  );
export const villageTaiga = (): THREE.Group =>
  village(
    '#8fa070',
    '#8a7a62',
    { wall: '#8f6a45', roof: '#4e3a2a', trim: '#5a4436' },
    { wall: '#a07850', roof: '#4e3a2a', w: 0.6 },
    (x, z) => tree(x, z, '#4f7a5a', '#4e3a2a', 'pine'),
    tree(0.65, 0.6, '#4f7a5a', '#4e3a2a', 'pine'),
  );
export const villageSnowy = (): THREE.Group =>
  village(
    '#f6f1e6',
    '#d9d0c4',
    { wall: '#8f6a45', roof: '#4e3a2a', snow: true, trim: '#5a4436' },
    { wall: '#e3d3a8', roof: '#6e5440', snow: true, w: 0.6 },
    (x, z) => tree(x, z, '#4f7a5a', '#4e3a2a', 'pine', true),
    tree(0.65, 0.6, '#4f7a5a', '#4e3a2a', 'pine', true),
  );
export const villageSavanna = (): THREE.Group =>
  village(
    '#c8b06a',
    '#b8946a',
    { wall: '#c8724a', roof: '#d9b866', roofType: 'pyramid' },
    { wall: '#d89a6a', roof: '#d9b866', roofType: 'pyramid', w: 0.6, d: 0.6 },
    (x, z) => tree(x, z, '#8fa85a', '#7a7266', 'flat'),
    well(0.55, 0.55),
  );
export function villageDesert(): THREE.Group {
  const cactus = (x: number, z: number) => {
    const c = new THREE.Group();
    c.add(cyl('#6f9a5a', 0.08, 0.08, 0.5, [0, 0.39, 0]));
    c.add(limb('#6f9a5a', 0.05, [0.08, 0.36, 0], [0.18, 0.5, 0]));
    c.position.set(x, 0, z);
    return c;
  };
  return village(
    '#e6d6b0',
    '#d0b888',
    { wall: '#e6d6b0', roof: '#d8c49a', roofType: 'flat', trim: '#c8a878' },
    { wall: '#dccb9c', roof: '#c0533a', roofType: 'flat', w: 0.6, h: 0.42 },
    cactus,
    cactus(0.7, 0.6),
  );
}

// --- other structures ----------------------------------------------------------------------------

export function camp(): THREE.Group {
  const g = new THREE.Group();
  g.add(base('#9db58a', 1.8, 1.8));
  g.add(gable('#3f7f86', 0.8, 0.7, 0.55, [-0.25, 0.14, -0.3]));
  g.add(rbox('#2a4a50', 0.18, 0.3, 0.02, 0.02, [-0.25, 0.3, 0.06]));
  g.add(cyl('#8f8a80', 0.16, 0.17, 0.06, [0.35, 0.17, 0.3]));
  for (const r of [0.4, -0.5]) g.add(cyl('#6e5440', 0.04, 0.04, 0.3, [0.35, 0.22, 0.3], [0, r, Math.PI / 2]));
  g.add(cone('#d8573c', 0.1, 0.24, [0.35, 0.34, 0.3]));
  g.add(cone('#f3cf6a', 0.05, 0.14, [0.35, 0.3, 0.32]));
  g.add(cyl('#8a6544', 0.08, 0.08, 0.5, [0.45, 0.22, -0.25], [0, 0, Math.PI / 2]));
  g.add(chest(-0.55, 0.5, 0.14, 0.4));
  return g;
}

export function swampHut(): THREE.Group {
  const g = new THREE.Group();
  g.add(base('#5d7a6a', 1.8, 1.8));
  g.add(rbox('#5d8fa8', 1.4, 0.03, 1.4, 0.03, [0, 0.15, 0]));
  for (const sx of [1, -1])
    for (const sz of [1, -1]) g.add(rbox('#4e3a2a', 0.07, 0.5, 0.07, 0.02, [sx * 0.35, 0.39, sz * 0.3]));
  const h = house(0, 0, { wall: '#5a4436', roof: '#3a2e26', w: 0.8, d: 0.7, h: 0.5 });
  h.position.y = 0.5;
  g.add(h);
  g.add(blob('#c0533a', 0.06, [0.5, 0.2, 0.5], [1, 0.6, 1]));
  g.add(cyl('#5a5652', 0.08, 0.06, 0.1, [-0.25, 1.06, 0.2]));
  return g;
}

function steps(
  color: string,
  levels: number,
  size: number,
  stepH: number,
  y0 = 0.14,
  accent?: string,
): THREE.Group {
  const g = new THREE.Group();
  for (let k = 0; k < levels; k++) {
    const s = size * (1 - k / (levels + 0.6));
    g.add(rbox(k % 2 && accent ? accent : color, s, stepH, s, 0.03, [0, y0 + stepH * (k + 0.5), 0]));
  }
  return g;
}

export function jungleTemple(): THREE.Group {
  const g = new THREE.Group();
  g.add(base('#6f9a52', 2, 2));
  g.add(steps('#8f9a80', 4, 1.6, 0.22));
  g.add(rbox('#2a3a2a', 0.26, 0.3, 0.03, 0.02, [0, 0.33, 0.81]));
  for (const [x, y, z] of [
    [0.6, 0.5, 0.6],
    [-0.5, 0.7, 0.45],
    [0.3, 0.9, -0.4],
    [-0.7, 0.3, -0.5],
  ])
    g.add(blob('#5f8a4e', 0.12, [x, y, z], [1, 1.4, 1]));
  g.add(tree(-0.85, 0.75, '#5f9a4e'));
  return g;
}

export function desertTemple(): THREE.Group {
  const g = new THREE.Group();
  g.add(base('#e6d6b0', 2.2, 2.2));
  g.add(steps('#e2cc98', 3, 1.4, 0.24, 0.14, '#d08a52'));
  for (const sx of [1, -1]) {
    g.add(rbox('#e2cc98', 0.36, 1.0, 0.36, 0.04, [sx * 0.8, 0.64, 0.6]));
    g.add(pyramid('#d08a52', 0.28, 0.24, [sx * 0.8, 1.26, 0.6]));
  }
  g.add(rbox('#3a2e26', 0.3, 0.36, 0.03, 0.02, [0, 0.32, 0.71]));
  return g;
}

export function igloo(): THREE.Group {
  const g = new THREE.Group();
  g.add(base('#f6f1e6', 1.8, 1.8));
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    toon('#fbf8f0'),
  );
  dome.position.set(0, 0.14, -0.1);
  g.add(dome);
  for (const y of [0.32, 0.5])
    g.add(
      cyl(
        '#e2ecf2',
        0.6 * Math.sqrt(1 - ((y - 0.14) / 0.6) ** 2) + 0.005,
        0.6 * Math.sqrt(1 - ((y - 0.14) / 0.6) ** 2) + 0.005,
        0.015,
        [0, y, -0.1],
      ),
    );
  const tunnel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.4, 24, 1, false, 0, Math.PI),
    toon('#fbf8f0'),
  );
  tunnel.rotation.set(Math.PI / 2, Math.PI / 2, 0);
  tunnel.position.set(0, 0.14, 0.55);
  g.add(tunnel);
  g.add(rbox('#3a4a5a', 0.24, 0.18, 0.02, 0.06, [0, 0.23, 0.76]));
  g.add(tree(0.65, 0.55, '#4f7a5a', '#4e3a2a', 'pine', true));
  return g;
}

export function mineshaft(ground = '#6a6660'): THREE.Group {
  const g = new THREE.Group();
  g.add(base(ground, 2, 2));
  for (const z of [-0.6, 0, 0.6]) {
    for (const s of [1, -1]) g.add(rbox('#8a6544', 0.08, 0.7, 0.08, 0.02, [s * 0.45, 0.49, z]));
    g.add(rbox('#8a6544', 1.0, 0.08, 0.1, 0.02, [0, 0.86, z]));
  }
  for (const s of [1, -1]) g.add(rbox('#a9a296', 0.04, 0.03, 1.8, 0.01, [s * 0.15, 0.16, 0]));
  for (let k = 0; k < 7; k++) g.add(rbox('#6e5440', 0.46, 0.025, 0.07, 0.01, [0, 0.15, -0.8 + k * 0.27]));
  g.add(rbox('#8f8a80', 0.34, 0.2, 0.4, 0.03, [0, 0.3, 0.3]));
  g.add(cyl('#3a3633', 0.05, 0.05, 0.02, [0.42, 0.89, 0.05]));
  return g;
}

export function oldRuins(): THREE.Group {
  const g = new THREE.Group();
  g.add(base('#9db58a', 2, 2));
  const wall = (x: number, z: number, w: number, h: number, ry: number, c: string) =>
    g.add(rbox(c, w, h, 0.16, 0.03, [x, 0.14 + h / 2, z], [0, ry, 0]));
  wall(-0.3, -0.5, 1.0, 0.6, 0, '#c0533a');
  wall(-0.75, 0, 0.8, 0.35, Math.PI / 2, '#b8704e');
  wall(0.35, -0.5, 0.4, 0.28, 0, '#c0533a');
  g.add(cyl('#e2ddd4', 0.1, 0.1, 0.8, [0.6, 0.54, 0.3]));
  g.add(rbox('#b8704e', 0.3, 0.12, 0.3, 0.03, [0.1, 0.2, 0.4], [0.2, 0.4, 0.1]));
  g.add(blob('#b8704e', 0.12, [-0.2, 0.18, 0.55], [1, 0.6, 1]));
  return g;
}

export function buriedTreasure(): THREE.Group {
  const g = new THREE.Group();
  g.add(base('#e6d6b0', 1.6, 1.6));
  g.add(blob('#d8c49a', 0.42, [0, 0.13, 0], [1.2, 0.16, 1]));
  const c = chest(0, 0, 0.1, 0.3);
  c.rotation.z = 0.15;
  g.add(c);
  g.add(rbox('#c0533a', 0.5, 0.03, 0.07, 0.01, [0.4, 0.16, 0.45], [0, Math.PI / 4, 0]));
  g.add(rbox('#c0533a', 0.5, 0.03, 0.07, 0.01, [0.4, 0.16, 0.45], [0, -Math.PI / 4, 0]));
  g.add(blob('#efc85a', 0.05, [-0.25, 0.2, 0.25]));
  return g;
}

export function shipwreck(beached = false): THREE.Group {
  const g = new THREE.Group();
  g.add(base(beached ? '#e6d6b0' : '#4f7a90', 2.2, 2.2));
  const hull = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-0.35, -0.9);
  s.lineTo(0.35, -0.9);
  s.quadraticCurveTo(0.4, 0.3, 0, 0.95);
  s.quadraticCurveTo(-0.4, 0.3, -0.35, -0.9);
  const inner = new THREE.Shape();
  inner.moveTo(-0.27, -0.82);
  inner.lineTo(0.27, -0.82);
  inner.quadraticCurveTo(0.31, 0.3, 0, 0.82);
  inner.quadraticCurveTo(-0.31, 0.3, -0.27, -0.82);
  s.holes.push(inner);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.4,
    bevelEnabled: true,
    bevelSize: 0.02,
    bevelThickness: 0.02,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);
  hull.add(new THREE.Mesh(geo, toon('#6e5440')));
  hull.add(rbox('#4e3a2a', 0.6, 0.04, 1.6, 0.02, [0, 0.12, 0]));
  hull.add(cyl('#8a6544', 0.04, 0.05, 1.0, [0.05, 0.6, 0.1], [0.4, 0, 0.25]));
  hull.add(blob('#e8e0c8', 0.3, [0.25, 0.8, 0.3], [0.1, 0.8, 1], [0.4, 0, 0.25]));
  hull.position.set(0, 0.1, 0);
  hull.rotation.set(0.05, 0.6, 0.25);
  g.add(hull);
  if (!beached)
    for (const [x, z] of [
      [-0.7, 0.6],
      [0.8, -0.5],
    ])
      g.add(blob('#5f8a4e', 0.08, [x, 0.4, z], [0.6, 3, 0.6]));
  return g;
}

export function oceanRuin(warm: boolean): THREE.Group {
  const g = new THREE.Group();
  g.add(base(warm ? '#5fa8b0' : '#4f7a90', 2, 2));
  const c = warm ? '#e2cc98' : '#9c9a94';
  g.add(rbox(c, 1.0, 0.5, 0.16, 0.03, [-0.2, 0.39, -0.45]));
  g.add(rbox(c, 0.16, 0.36, 0.8, 0.03, [-0.65, 0.32, 0]));
  g.add(rbox(c, 0.5, 0.2, 0.5, 0.03, [0.4, 0.24, -0.1], [0, 0.3, 0]));
  g.add(cyl(c, 0.1, 0.1, 0.7, [0.55, 0.49, 0.45]));
  if (warm)
    for (const [x, z, col] of [
      [0, 0.4, '#e98fa8'],
      [-0.3, 0.6, '#e8c45a'],
      [0.3, 0.7, '#d8573c'],
    ] as [number, number, string][])
      g.add(blob(col, 0.1, [x, 0.22, z], [1, 1.3, 1]));
  else
    for (const [x, z] of [
      [0, 0.5],
      [-0.35, 0.65],
      [0.25, 0.75],
    ])
      g.add(blob('#5f8a4e', 0.06, [x, 0.4, z], [0.6, 3.4, 0.6]));
  g.add(chest(0.1, 0.1, 0.14, -0.3));
  return g;
}
