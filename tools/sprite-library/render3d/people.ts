/** Monsters and characters (face +z, stand on y = 0). Chibi proportions: big heads, rounded limbs. */
import * as THREE from 'three';
import { blob, cone, cyl, eyes, limb, rbox, toon, torus } from './kit';

const INK = '#2a221d';

interface HumanSpec {
  skin: string;
  shirt: string;
  pants: string;
  shoes: string;
  armsForward?: boolean;
  robe?: string;
}

/** A chibi humanoid. Returns the root and a head group (origin at head centre, face +z). */
function humanoid(o: HumanSpec): { g: THREE.Group; head: THREE.Group } {
  const g = new THREE.Group();
  for (const s of [1, -1]) {
    g.add(limb(o.pants, 0.075, [s * 0.09, 0.42, 0], [s * 0.09, 0.08, 0]));
    g.add(rbox(o.shoes, 0.15, 0.09, 0.22, 0.04, [s * 0.09, 0.045, 0.03]));
  }
  if (o.robe) g.add(cyl(o.robe, 0.2, 0.3, 0.55, [0, 0.4, 0]));
  g.add(rbox(o.shirt, 0.36, 0.38, 0.24, 0.09, [0, 0.66, 0]));
  for (const s of [1, -1]) {
    if (o.armsForward) {
      g.add(limb(o.shirt, 0.06, [s * 0.22, 0.78, 0.02], [s * 0.22, 0.76, 0.3]));
      g.add(blob(o.skin, 0.065, [s * 0.22, 0.76, 0.38]));
    } else {
      g.add(limb(o.shirt, 0.06, [s * 0.24, 0.8, 0], [s * 0.27, 0.56, 0.02]));
      g.add(blob(o.skin, 0.065, [s * 0.27, 0.5, 0.03]));
    }
  }
  const head = new THREE.Group();
  head.position.set(0, 1.08, 0.02);
  head.add(blob(o.skin, 0.26, [0, 0, 0], [1, 0.95, 0.95]));
  g.add(head);
  return { g, head };
}

export function player(): THREE.Group {
  const { g, head } = humanoid({ skin: '#f0d0b0', shirt: '#3f7f86', pants: '#5a4a42', shoes: '#6e5440' });
  g.add(rbox('#8a6544', 0.38, 0.05, 0.26, 0.02, [0, 0.52, 0]));
  head.add(blob('#4a3a32', 0.2, [0, 0.12, 0.1], [1.25, 0.5, 0.9]));
  head.add(eyes(0.09, -0.02, 0.22, 0.032));
  head.add(
    blob('#e98fa8', 0.04, [0.15, -0.08, 0.18], [1, 0.6, 0.4]),
    blob('#e98fa8', 0.04, [-0.15, -0.08, 0.18], [1, 0.6, 0.4]),
  );
  // Hood: a shell behind and over the head.
  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.62),
    toon('#2f6a70'),
  );
  hood.position.set(0, 1.1, -0.04);
  hood.rotation.x = -0.55;
  g.add(hood);
  g.add(torus('#d8573c', 0.16, 0.05, [0, 0.86, 0.01], [Math.PI / 2, 0, 0]));
  g.add(rbox('#d8573c', 0.08, 0.22, 0.04, 0.02, [0.09, 0.74, 0.14], [0.1, 0, 0.15]));
  return g;
}

export function zombie(): THREE.Group {
  const { g, head } = humanoid({
    skin: '#94ab84',
    shirt: '#5a7a9a',
    pants: '#4a4a5e',
    shoes: '#3a3633',
    armsForward: true,
  });
  for (let k = 0; k < 5; k++)
    g.add(cone('#5a7a9a', 0.04, 0.08, [-0.14 + k * 0.07, 0.44, 0.1], [Math.PI, 0, 0]));
  for (const [x, z] of [
    [0.1, 0.06],
    [-0.08, 0.1],
    [0, -0.1],
    [0.14, -0.06],
    [-0.15, -0.04],
  ])
    head.add(blob('#4a4236', 0.1, [x, 0.17, z], [1, 0.6, 1]));
  head.add(blob('#f2ece0', 0.055, [0.1, 0, 0.22]));
  head.add(eyes(0.1, 0, 0.26, 0.025).children[0]);
  head.add(limb(INK, 0.012, [-0.14, 0.01, 0.23], [-0.05, 0.01, 0.25]));
  head.add(limb(INK, 0.012, [-0.1, -0.12, 0.23], [0.1, -0.12, 0.23]));
  head.add(blob('#7a9068', 0.05, [-0.18, -0.06, 0.15], [1, 0.7, 0.4]));
  return g;
}

export function skeleton(): THREE.Group {
  const bone = '#ece6da';
  const g = new THREE.Group();
  for (const s of [1, -1]) {
    g.add(limb(bone, 0.035, [s * 0.08, 0.44, 0], [s * 0.08, 0.04, 0]));
    g.add(limb(bone, 0.03, [s * 0.18, 0.84, 0], [s * 0.22, 0.5, 0.03]));
  }
  g.add(limb(bone, 0.04, [0, 0.46, 0], [0, 0.88, 0]));
  for (let k = 0; k < 3; k++)
    g.add(
      torus(
        bone,
        0.12 - k * 0.012,
        0.018,
        [0, 0.8 - k * 0.09, 0],
        [Math.PI / 2, 0, 0],
        Math.PI * 2,
        [1, 0.75, 1],
      ),
    );
  g.add(limb(bone, 0.04, [-0.1, 0.46, 0], [0.1, 0.46, 0]));
  g.add(limb(bone, 0.035, [-0.18, 0.86, 0], [0.18, 0.86, 0]));
  const head = new THREE.Group();
  head.position.set(0, 1.08, 0.02);
  head.add(blob(bone, 0.24, [0, 0.02, 0], [1, 0.95, 0.95]));
  head.add(rbox(bone, 0.24, 0.1, 0.18, 0.04, [0, -0.17, 0.05]));
  head.add(
    blob(INK, 0.065, [0.09, 0.02, 0.19], [1, 1.2, 0.5]),
    blob(INK, 0.065, [-0.09, 0.02, 0.19], [1, 1.2, 0.5]),
  );
  head.add(cone(INK, 0.03, 0.05, [0, -0.07, 0.22], [Math.PI, 0, 0], [1, 1, 0.4]));
  g.add(head);
  return g;
}

export function witch(): THREE.Group {
  const { g, head } = humanoid({
    skin: '#b8c890',
    shirt: '#5a3a6e',
    pants: '#3a2a3a',
    shoes: '#3a2a3a',
    robe: '#5a3a6e',
  });
  head.add(eyes(0.09, 0, 0.22, 0.028));
  head.add(cone('#a8b878', 0.05, 0.16, [0, -0.06, 0.28], [Math.PI / 2 + 0.3, 0, 0]));
  head.add(blob('#6a7a4a', 0.018, [0.02, -0.1, 0.32]));
  g.add(cyl('#4a2e5e', 0.42, 0.42, 0.03, [0, 1.24, 0.02]));
  g.add(cone('#5a3a6e', 0.22, 0.5, [0, 1.5, -0.02], [-0.12, 0, 0]));
  g.add(cyl('#e8c45a', 0.225, 0.225, 0.05, [0, 1.29, 0.02]));
  return g;
}

export function spider(): THREE.Group {
  const c = '#3a3633';
  const g = new THREE.Group();
  for (const s of [1, -1])
    for (let k = 0; k < 4; k++) {
      const z = 0.18 - k * 0.12;
      const knee: [number, number, number] = [s * 0.34, 0.38, z * 1.6 + (k - 1.5) * 0.04];
      g.add(limb(c, 0.025, [s * 0.1, 0.24, z * 0.6], knee));
      g.add(limb(c, 0.022, knee, [s * 0.52, 0.02, z * 2.2 + (k - 1.5) * 0.1]));
    }
  g.add(blob(c, 0.24, [0, 0.3, -0.22], [1, 0.8, 1.1]));
  g.add(blob('#4a4643', 0.15, [0, 0.24, 0.14]));
  for (const [x, y, r] of [
    [0.05, 0.3, 0.03],
    [-0.05, 0.3, 0.03],
    [0.1, 0.25, 0.02],
    [-0.1, 0.25, 0.02],
  ])
    g.add(
      new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshBasicMaterial({ color: '#d8573c' }))
        .translateX(x)
        .translateY(y)
        .translateZ(0.27),
    );
  return g;
}

export function snowman(): THREE.Group {
  const g = new THREE.Group();
  g.add(blob('#f6f1e6', 0.32, [0, 0.3, 0]));
  g.add(blob('#fbf8f0', 0.24, [0, 0.76, 0]));
  for (const s of [1, -1]) g.add(limb('#8a6544', 0.02, [s * 0.22, 0.42, 0], [s * 0.5, 0.62, 0.05]));
  g.add(torus('#d8573c', 0.19, 0.05, [0, 0.58, 0], [Math.PI / 2, 0, 0]));
  g.add(cone('#df8a45', 0.04, 0.2, [0, 0.76, 0.32], [Math.PI / 2, 0, 0]));
  g.add(eyes(0.08, 0.84, 0.21, 0.028));
  for (const y of [0.3, 0.42]) g.add(blob(INK, 0.03, [0, y, 0.31]));
  return g;
}

/** Matches the in-game Puffball (src/entities/mobs.ts): faceted lavender body, tufts, sprout, feet. */
export function puffball(): THREE.Group {
  const g = new THREE.Group();
  const r = 0.42;
  const geo = new THREE.IcosahedronGeometry(r, 2).toNonIndexed();
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, toon('#b9a6e8'));
  body.position.y = r + 0.06;
  g.add(body);
  for (const [x, y, z] of [
    [0.18, 0.86, 0.06],
    [-0.16, 0.84, -0.04],
    [0.02, 0.9, -0.16],
  ]) {
    const t = new THREE.IcosahedronGeometry(r * 0.32, 0).toNonIndexed();
    t.computeVertexNormals();
    g.add(new THREE.Mesh(t, toon('#d8cdf6')).translateX(x).translateY(y).translateZ(z));
  }
  g.add(limb('#4f8a5b', 0.02, [0, 0.88, 0], [0, 1.04, 0]));
  g.add(blob('#6fbf73', 0.08, [0.06, 1.06, 0], [1, 0.5, 0.7], [0, 0, -0.4]));
  for (const s of [1, -1]) {
    g.add(blob('#8f7cc4', 0.09, [s * 0.18, 0.06, 0.12], [1, 0.7, 1.2]));
    g.add(blob('#ffffff', 0.1, [s * 0.14, 0.56, 0.36]));
  }
  g.add(eyes(0.14, 0.56, 0.44, 0.05, '#2a2140'));
  return g;
}
