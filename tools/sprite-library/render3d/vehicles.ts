/** Vehicles and placeable objects (front toward +z, resting on y = 0). */
import * as THREE from 'three';
import { blob, cyl, rbox, toon } from './kit';

const WOODS: Record<string, string> = {
  oak: '#c9a57a',
  birch: '#e3d3a8',
  spruce: '#8f6a45',
  jungle: '#c28a62',
  dark_oak: '#6a4a32',
  acacia: '#c8724a',
  mangrove: '#8e4a42',
  cherry: '#e8b8b0',
  bamboo: '#d9c26a',
};

function hullShape(len: number, beam: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-beam, -len * 0.45);
  s.lineTo(beam, -len * 0.45);
  s.quadraticCurveTo(beam * 1.05, len * 0.15, 0, len * 0.55);
  s.quadraticCurveTo(-beam * 1.05, len * 0.15, -beam, -len * 0.45);
  return s;
}

function chest(y: number, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.add(rbox('#b07a4a', 0.34, 0.28, 0.3, 0.03, [0, y + 0.14, z]));
  g.add(rbox('#5a4a3a', 0.35, 0.03, 0.31, 0.01, [0, y + 0.2, z]));
  g.add(rbox('#d9c088', 0.06, 0.08, 0.02, 0.01, [0, y + 0.18, z + 0.16]));
  return g;
}

export function boat(wood: string, withChest = false): THREE.Group {
  const c = WOODS[wood];
  const g = new THREE.Group();
  const shell = hullShape(1.3, 0.38);
  shell.holes.push(hullShape(1.12, 0.3));
  const outer = new THREE.ExtrudeGeometry(shell, {
    depth: 0.26,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 3,
  });
  outer.rotateX(-Math.PI / 2);
  const hull = new THREE.Mesh(outer, toon(c));
  hull.position.y = 0.04;
  g.add(hull);
  const inner = new THREE.ExtrudeGeometry(hullShape(1.15, 0.31), { depth: 0.05, bevelEnabled: false });
  inner.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(inner, toon(new THREE.Color(c).multiplyScalar(0.62).getStyle()));
  floor.position.y = 0.08;
  g.add(floor);
  g.add(rbox(c, 0.66, 0.04, 0.12, 0.02, [0, 0.3, 0.05]));
  for (const s of [1, -1]) {
    const oar = cyl(
      new THREE.Color(c).multiplyScalar(0.8).getStyle(),
      0.018,
      0.018,
      0.9,
      [s * 0.48, 0.34, -0.05],
      [0.25, 0, s * 1.15],
    );
    g.add(oar);
    g.add(
      rbox(
        new THREE.Color(c).multiplyScalar(0.8).getStyle(),
        0.06,
        0.02,
        0.16,
        0.01,
        [s * 0.86, 0.16, -0.12],
        [0, 0, s * 0.4],
      ),
    );
  }
  if (withChest) g.add(chest(0.12, -0.3));
  return g;
}

export function raft(withChest = false): THREE.Group {
  const c = WOODS.bamboo;
  const g = new THREE.Group();
  for (let k = 0; k < 6; k++)
    g.add(cyl(k % 2 ? '#c8b05a' : c, 0.07, 0.07, 1.3, [-0.35 + k * 0.14, 0.08, 0], [Math.PI / 2, 0, 0]));
  for (const z of [-0.45, 0.45]) g.add(cyl('#8a6544', 0.03, 0.03, 0.9, [0, 0.16, z], [0, 0, Math.PI / 2]));
  if (withChest) g.add(chest(0.15, -0.2));
  return g;
}

export function cart(kind = ''): THREE.Group {
  const metal = '#8f8a80';
  const g = new THREE.Group();
  for (const sx of [1, -1])
    for (const sz of [1, -1])
      g.add(cyl('#5a5652', 0.12, 0.12, 0.06, [sx * 0.3, 0.12, sz * 0.26], [0, 0, Math.PI / 2]));
  g.add(rbox(metal, 0.62, 0.06, 0.78, 0.02, [0, 0.2, 0]));
  for (const sx of [1, -1]) g.add(rbox(metal, 0.06, 0.34, 0.78, 0.02, [sx * 0.29, 0.38, 0]));
  for (const sz of [1, -1]) g.add(rbox(metal, 0.62, 0.34, 0.06, 0.02, [0, 0.38, sz * 0.36]));
  for (const sx of [1, -1]) g.add(rbox('#6e6a62', 0.08, 0.04, 0.82, 0.02, [sx * 0.3, 0.56, 0]));
  for (const sz of [1, -1]) g.add(rbox('#6e6a62', 0.66, 0.04, 0.08, 0.02, [0, 0.56, sz * 0.37]));
  if (kind === 'chest') g.add(chest(0.24));
  if (kind === 'furnace') {
    g.add(rbox('#a9a59c', 0.44, 0.36, 0.56, 0.04, [0, 0.42, 0]));
    g.add(rbox('#3a3633', 0.2, 0.14, 0.02, 0.02, [0, 0.46, 0.39]));
    g.add(rbox('#e08a4a', 0.16, 0.05, 0.02, 0.01, [0, 0.42, 0.4]));
  }
  if (kind === 'blast') {
    g.add(cyl('#c0533a', 0.2, 0.2, 0.42, [0, 0.46, 0]));
    g.add(cyl('#f2ece0', 0.205, 0.205, 0.12, [0, 0.5, 0]));
  }
  return g;
}

export function armourStand(): THREE.Group {
  const wood = '#c9a57a';
  const g = new THREE.Group();
  g.add(rbox('#b8b4aa', 0.6, 0.06, 0.6, 0.02, [0, 0.03, 0]));
  g.add(rbox(wood, 0.08, 1.2, 0.08, 0.02, [0, 0.66, 0]));
  g.add(rbox(wood, 0.64, 0.08, 0.1, 0.02, [0, 1.12, 0]));
  g.add(rbox(wood, 0.36, 0.07, 0.1, 0.02, [0, 0.66, 0]));
  for (const s of [1, -1]) g.add(rbox(wood, 0.07, 0.56, 0.07, 0.02, [s * 0.1, 0.34, 0]));
  g.add(blob(wood, 0.13, [0, 1.36, 0]));
  return g;
}

export function itemFrame(): THREE.Group {
  const g = new THREE.Group();
  g.add(rbox('#8a6544', 0.8, 0.8, 0.08, 0.03, [0, 0.46, 0], [-0.1, 0, 0]));
  g.add(rbox('#a8683a', 0.6, 0.6, 0.04, 0.01, [0, 0.46, 0.03], [-0.1, 0, 0]));
  g.add(blob('#c0433a', 0.15, [0, 0.45, 0.14]));
  g.add(cyl('#6e5440', 0.012, 0.012, 0.08, [0, 0.62, 0.13]));
  g.add(blob('#6f8f4e', 0.05, [0.05, 0.64, 0.13], [1.2, 0.4, 0.7]));
  g.add(rbox('#6e5440', 0.3, 0.04, 0.2, 0.01, [0, 0.02, -0.08]));
  return g;
}
