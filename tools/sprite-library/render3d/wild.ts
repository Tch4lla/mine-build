/** Wild animals (all face +z, stand on y = 0). */
import * as THREE from 'three';
import { blob, capsule, cone, eyes, limb, quad, torus } from './kit';

const INK = '#2a221d';

function pointyEars(head: THREE.Group, c: string, inner: string, y: number, spread: number, h = 0.13): void {
  for (const s of [1, -1]) {
    head.add(cone(c, 0.065, h, [s * spread, y, -0.02], [0, 0, s * -0.25], [1, 1, 0.55]));
    head.add(cone(inner, 0.035, h * 0.6, [s * spread, y - 0.01, 0.015], [0, 0, s * -0.25], [1, 1, 0.4]));
  }
}

export function fox(): THREE.Group {
  const c = '#df8a45';
  const { g, head, bodyY } = quad({
    coat: c,
    legColor: '#3a3028',
    body: [0.22, 0.2, 0.42],
    legLen: 0.24,
    legR: 0.05,
    head: { r: 0.17, y: 0.62, z: 0.46 },
  });
  g.add(blob('#f6f1e6', 0.15, [0, bodyY - 0.02, 0.3], [0.9, 0.9, 0.7]));
  head.add(cone(c, 0.1, 0.2, [0, -0.04, 0.2], [Math.PI / 2, 0, 0]));
  head.add(
    blob('#f6f1e6', 0.08, [0.07, -0.06, 0.12], [1, 0.8, 1.2]),
    blob('#f6f1e6', 0.08, [-0.07, -0.06, 0.12], [1, 0.8, 1.2]),
  );
  head.add(blob(INK, 0.025, [0, -0.04, 0.3]));
  head.add(eyes(0.08, 0.03, 0.13, 0.025));
  pointyEars(head, c, INK, 0.17, 0.09);
  g.add(blob(c, 0.14, [0, bodyY + 0.08, -0.55], [0.85, 0.85, 1.5], [0.5, 0, 0]));
  g.add(blob('#f6f1e6', 0.08, [0, bodyY + 0.2, -0.74]));
  return g;
}

export function feline(coat: string, mark: string, spots = false): THREE.Group {
  const { g, head, bodyY } = quad({
    coat,
    body: [0.18, 0.17, 0.36],
    legLen: 0.22,
    legR: 0.045,
    head: { r: 0.15, y: 0.56, z: 0.38 },
  });
  if (spots) {
    for (const [x, y, z] of [
      [0.15, 0.08, 0.1],
      [-0.15, 0.06, -0.05],
      [0.12, 0.12, -0.18],
      [-0.1, 0.13, 0.15],
      [0.16, 0, -0.25],
      [0, 0.17, 0],
    ])
      g.add(blob(mark, 0.04, [x, bodyY + y, z], [1, 1, 0.5]));
  } else {
    for (const z of [0.15, 0, -0.15, -0.28])
      g.add(torus(mark, 0.17, 0.018, [0, bodyY + 0.01, z], [0, 0, 0], Math.PI, [1.05, 1, 1]));
  }
  head.add(blob('#f6f1e6', 0.07, [0, -0.05, 0.11], [1.2, 0.8, 0.8]));
  head.add(blob('#e98fa8', 0.018, [0, -0.02, 0.15]));
  head.add(eyes(0.065, 0.03, 0.12, 0.03, '#4a6a2a'));
  pointyEars(head, coat, '#e9a0b4', 0.14, 0.08, 0.11);
  g.add(limb(coat, 0.035, [0, bodyY + 0.05, -0.34], [0, bodyY + 0.28, -0.5]));
  g.add(limb(coat, 0.035, [0, bodyY + 0.28, -0.5], [0, bodyY + 0.42, -0.42]));
  return g;
}

export function wolf(): THREE.Group {
  const c = '#a9a59c';
  const { g, head, bodyY } = quad({
    coat: c,
    body: [0.24, 0.22, 0.46],
    legLen: 0.3,
    legR: 0.06,
    head: { r: 0.18, y: 0.74, z: 0.5 },
  });
  g.add(blob('#e2ddd4', 0.16, [0, bodyY - 0.03, 0.32], [0.9, 0.9, 0.7]));
  head.add(blob('#e2ddd4', 0.1, [0, -0.06, 0.17], [0.8, 0.7, 1.2]));
  head.add(blob(INK, 0.03, [0, -0.03, 0.29]));
  head.add(eyes(0.085, 0.04, 0.13, 0.026, '#8a6a2a'));
  pointyEars(head, c, '#e2ddd4', 0.17, 0.09);
  g.add(blob(c, 0.12, [0, bodyY - 0.05, -0.56], [0.8, 0.8, 1.6], [-0.7, 0, 0]));
  return g;
}

export function bear(coat = '#f2ece0', panda = false): THREE.Group {
  const black = '#3a3633';
  const { g, head, bodyY } = quad({
    coat,
    legColor: panda ? black : coat,
    body: [0.36, 0.32, 0.52],
    legLen: 0.22,
    legR: 0.11,
    head: { r: 0.24, y: 0.72, z: 0.56 },
  });
  if (panda) g.add(blob(black, 1, [0, bodyY + 0.02, 0.18], [0.375, 0.335, 0.16]));
  head.add(blob(panda ? '#f6f1e6' : '#ece6da', 0.11, [0, -0.06, 0.2], [1, 0.8, 0.8]));
  head.add(blob(INK, 0.035, [0, -0.02, 0.3]));
  if (panda) {
    for (const s of [1, -1])
      head.add(blob(black, 0.06, [s * 0.1, 0.05, 0.18], [0.9, 1.2, 0.5], [0, 0, s * 0.4]));
    head.add(eyes(0.1, 0.06, 0.21, 0.022, '#f6f1e6'));
  } else head.add(eyes(0.1, 0.06, 0.2, 0.028));
  for (const s of [1, -1]) head.add(blob(panda ? black : coat, 0.07, [s * 0.16, 0.18, 0], [1, 1, 0.6]));
  g.add(blob(panda ? black : coat, 0.07, [0, bodyY + 0.1, -0.52]));
  return g;
}

export function armadillo(): THREE.Group {
  const skin = '#e0b0a0';
  const shell = '#c8907a';
  const g = new THREE.Group();
  for (const sx of [1, -1])
    for (const sz of [1, -1])
      g.add(limb(skin, 0.045, [sx * 0.14, 0.15, sz * 0.18], [sx * 0.14, 0.04, sz * 0.18]));
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    blob(shell, 1).material as THREE.Material,
  );
  dome.position.set(0, 0.12, 0);
  dome.scale.set(0.26, 0.26, 0.36);
  g.add(dome);
  for (const z of [-0.2, -0.1, 0, 0.1, 0.2])
    g.add(torus('#a87060', 0.26 * Math.sqrt(1 - (z / 0.36) ** 2), 0.012, [0, 0.12, z], [0, 0, 0], Math.PI));
  g.add(blob(skin, 0.1, [0, 0.16, 0.4], [0.8, 0.8, 1.2]));
  g.add(cone(skin, 0.05, 0.12, [0, 0.13, 0.52], [Math.PI / 2, 0, 0]));
  g.add(eyes(0.05, 0.2, 0.47, 0.018));
  for (const s of [1, -1])
    g.add(capsule(skin, 0.025, 0.06, [s * 0.05, 0.27, 0.38], [1, 1, 0.5], [0, 0, s * -0.3]));
  g.add(cone(skin, 0.04, 0.22, [0, 0.12, -0.46], [-Math.PI / 2 - 0.2, 0, 0]));
  return g;
}

export function frog(): THREE.Group {
  const c = '#7caa52';
  const g = new THREE.Group();
  for (const s of [1, -1]) {
    g.add(blob(c, 0.12, [s * 0.2, 0.1, -0.08], [0.8, 0.6, 1.4]));
    g.add(blob(c, 0.06, [s * 0.24, 0.03, 0.08], [1, 0.4, 1.6]));
    g.add(limb(c, 0.04, [s * 0.13, 0.2, 0.18], [s * 0.15, 0.04, 0.26]));
  }
  g.add(blob(c, 0.28, [0, 0.22, 0], [1, 0.72, 1]));
  g.add(blob('#e8e0a8', 0.2, [0, 0.16, 0.08], [1, 0.6, 1]));
  for (const s of [1, -1]) {
    g.add(blob(c, 0.08, [s * 0.12, 0.38, 0.12]));
    g.add(blob('#f6f1e6', 0.05, [s * 0.13, 0.4, 0.17]));
  }
  g.add(eyes(0.13, 0.41, 0.21, 0.025));
  g.add(torus(INK, 0.12, 0.01, [0, 0.22, 0.2], [Math.PI / 2 + 0.3, 0, 0], Math.PI, [1, 1, 0.6]));
  return g;
}

export function turtle(): THREE.Group {
  const skin = '#7caa62';
  const g = new THREE.Group();
  for (const sx of [1, -1]) {
    g.add(blob(skin, 0.11, [sx * 0.3, 0.06, 0.22], [1.4, 0.35, 0.8], [0, sx * 0.4, 0]));
    g.add(blob(skin, 0.08, [sx * 0.24, 0.05, -0.26], [1.2, 0.35, 0.8]));
  }
  g.add(blob('#e0d090', 0.34, [0, 0.12, 0], [1, 0.25, 1.2]));
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    blob('#5f8a4e', 1).material as THREE.Material,
  );
  dome.position.set(0, 0.14, 0);
  dome.scale.set(0.34, 0.24, 0.42);
  g.add(dome);
  g.add(blob('#7aa862', 0.1, [0, 0.36, 0], [1, 0.3, 1.2]));
  for (const [x, z] of [
    [0.17, 0.15],
    [-0.17, 0.15],
    [0.17, -0.15],
    [-0.17, -0.15],
  ])
    g.add(blob('#6f9a5a', 0.08, [x, 0.3, z], [1, 0.35, 1]));
  g.add(limb(skin, 0.07, [0, 0.16, 0.36], [0, 0.22, 0.52]));
  g.add(blob(skin, 0.1, [0, 0.24, 0.56], [0.9, 0.85, 1.1]));
  g.add(eyes(0.06, 0.27, 0.62, 0.02));
  g.add(cone(skin, 0.04, 0.12, [0, 0.12, -0.5], [-Math.PI / 2, 0, 0]));
  return g;
}

export function axolotl(): THREE.Group {
  const c = '#f0b8c8';
  const g = new THREE.Group();
  for (const sx of [1, -1])
    for (const z of [0.18, -0.16]) g.add(limb(c, 0.035, [sx * 0.1, 0.12, z], [sx * 0.18, 0.03, z + 0.03]));
  g.add(capsule(c, 0.13, 0.4, [0, 0.15, -0.02], [1, 0.85, 1], [Math.PI / 2, 0, 0]));
  g.add(blob(c, 0.12, [0, 0.17, -0.42], [0.25, 0.9, 1.6]));
  g.add(blob(c, 0.17, [0, 0.2, 0.34], [1.1, 0.85, 1]));
  for (const s of [1, -1])
    for (let k = 0; k < 3; k++)
      g.add(
        capsule(
          '#d8607a',
          0.022,
          0.09,
          [s * (0.17 + k * 0.01), 0.3 - k * 0.05, 0.26],
          [1, 1, 1],
          [0, 0, s * (-0.7 + k * 0.5)],
        ),
      );
  g.add(eyes(0.1, 0.24, 0.46, 0.022));
  g.add(torus('#2a221d', 0.06, 0.008, [0, 0.16, 0.49], [Math.PI / 2 + 0.2, 0, 0], Math.PI, [1, 1, 0.6]));
  return g;
}
