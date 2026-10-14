/** Water creatures and flyers (face +z). Swimmers and flyers hover above their shadow. */
import * as THREE from 'three';
import { blob, capsule, cone, eyes, limb, toon } from './kit';

const INK = '#2a221d';

export function fish(color: string, stripes?: string, size = 1): THREE.Group {
  const g = new THREE.Group();
  const y = 0.32;
  g.add(blob(color, 0.18, [0, y, 0], [0.55, 1, 1.5]));
  g.add(blob(color, 0.1, [0, y, -0.32], [0.25, 1.1, 0.8]));
  g.add(cone(color, 0.06, 0.12, [0, y + 0.18, -0.02], [0, 0, 0], [0.3, 1, 1.4]));
  g.add(
    blob(color, 0.05, [0.08, y - 0.06, 0.08], [0.3, 0.6, 1], [0, 0.4, 0]),
    blob(color, 0.05, [-0.08, y - 0.06, 0.08], [0.3, 0.6, 1], [0, -0.4, 0]),
  );
  if (stripes) for (const z of [0.1, -0.1]) g.add(blob(stripes, 0.18, [0, y, z], [0.57, 1.02, 0.12]));
  g.add(eyes(0.085, y + 0.04, 0.17, 0.025));
  g.scale.setScalar(size);
  return g;
}

export function pufferfish(): THREE.Group {
  const c = '#e8c45a';
  const g = new THREE.Group();
  const y = 0.32;
  g.add(blob(c, 0.24, [0, y, 0]));
  g.add(blob('#f6e6a8', 0.2, [0, y - 0.06, 0.04], [1, 0.7, 1]));
  const geo = new THREE.SphereGeometry(1, 8, 6);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i += 2) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i).normalize();
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 8), toon('#c8a03a'));
    sp.position.copy(v.clone().multiplyScalar(0.25)).add(new THREE.Vector3(0, y, 0));
    sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
    g.add(sp);
  }
  g.add(cone(c, 0.06, 0.1, [0, y, -0.28], [-Math.PI / 2, 0, 0], [0.4, 1, 1]));
  g.add(eyes(0.1, y + 0.08, 0.19, 0.035));
  g.add(blob('#c0634a', 0.03, [0, y - 0.04, 0.24], [1.2, 0.8, 0.6]));
  return g;
}

export function dolphin(): THREE.Group {
  const c = '#8a9aaa';
  const g = new THREE.Group();
  const y = 0.34;
  g.add(blob(c, 0.2, [0, y, 0], [0.8, 0.85, 2.2]));
  g.add(blob('#e2ecf2', 0.18, [0, y - 0.06, 0.05], [0.7, 0.6, 2]));
  g.add(capsule(c, 0.05, 0.12, [0, y - 0.04, 0.5], [1, 1, 1], [Math.PI / 2, 0, 0]));
  g.add(cone(c, 0.07, 0.18, [0, y + 0.22, -0.05], [-0.4, 0, 0], [0.3, 1, 1]));
  for (const s of [1, -1]) {
    g.add(blob(c, 0.08, [s * 0.18, y - 0.1, 0.12], [1.2, 0.2, 0.7], [0, s * 0.5, s * -0.4]));
    g.add(blob(c, 0.08, [s * 0.09, y + 0.02, -0.5], [1.4, 0.2, 0.6], [0, s * -0.3, 0]));
  }
  g.add(eyes(0.13, y + 0.03, 0.3, 0.022));
  return g;
}

export function nautilus(): THREE.Group {
  const g = new THREE.Group();
  const y = 0.36;
  g.add(blob('#f2e6d0', 0.3, [0, y, -0.05], [0.7, 1, 1]));
  for (let k = 0; k < 5; k++) {
    const a = -0.9 + k * 0.45;
    g.add(blob('#c0634a', 0.3, [0, y, -0.05], [0.72, 0.12, 1.02], [a, 0, 0]));
  }
  g.add(blob('#e8dcc4', 0.12, [0, y - 0.05, 0.22], [0.8, 0.8, 0.6]));
  for (let k = 0; k < 6; k++) {
    const x = -0.1 + (k % 3) * 0.1;
    const yy = y - 0.08 - Math.floor(k / 3) * 0.06;
    g.add(limb('#e0b090', 0.022, [x, yy, 0.26], [x * 1.4, yy - 0.12, 0.42]));
  }
  g.add(eyes(0.1, y + 0.02, 0.26, 0.025));
  return g;
}

export function squid(): THREE.Group {
  const c = '#3d5a80';
  const g = new THREE.Group();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const x = Math.cos(a) * 0.1;
    const z = Math.sin(a) * 0.1;
    g.add(limb('#4f6e98', 0.03, [x, 0.36, z], [x * 2.2, 0.06, z * 2.2]));
  }
  g.add(capsule(c, 0.17, 0.32, [0, 0.62, 0], [1, 1, 1]));
  g.add(cone(c, 0.18, 0.18, [0, 0.95, 0], [0, 0, 0], [1, 1, 0.4]));
  g.add(eyes(0.11, 0.48, 0.13, 0.04));
  return g;
}

export function tadpole(): THREE.Group {
  const g = new THREE.Group();
  const y = 0.24;
  g.add(blob('#5a5048', 0.14, [0, y, 0.05], [1, 0.9, 1.1]));
  g.add(blob('#6a6058', 0.08, [0, y, -0.2], [0.25, 0.8, 1.8]));
  g.add(eyes(0.08, y + 0.04, 0.15, 0.03));
  return g;
}

export function bee(): THREE.Group {
  const g = new THREE.Group();
  const y = 0.5;
  g.add(blob('#e8c45a', 0.2, [0, y, -0.06], [0.95, 0.9, 1.3]));
  for (const z of [-0.02, -0.16]) g.add(blob('#3a3633', 0.2, [0, y, z], [0.97, 0.92, 0.18]));
  g.add(cone('#3a3633', 0.04, 0.1, [0, y, -0.34], [-Math.PI / 2, 0, 0]));
  g.add(blob('#e8c45a', 0.14, [0, y + 0.02, 0.2]));
  g.add(eyes(0.07, y + 0.05, 0.31, 0.03));
  for (const s of [1, -1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), toon('#e2ecf2', { opacity: 0.8 }));
    wing.position.set(s * 0.14, y + 0.2, -0.04);
    wing.scale.set(1, 0.18, 0.6);
    wing.rotation.set(0, 0, s * 0.5);
    g.add(wing);
    g.add(limb(INK, 0.008, [s * 0.04, y + 0.12, 0.28], [s * 0.08, y + 0.24, 0.34]));
    g.add(limb(INK, 0.012, [s * 0.06, y - 0.15, 0.05], [s * 0.08, y - 0.24, 0.07]));
  }
  return g;
}

export function bat(): THREE.Group {
  const c = '#5a4a52';
  const g = new THREE.Group();
  const y = 0.62;
  g.add(blob('#6a5a62', 0.14, [0, y, 0], [0.9, 1.1, 0.85]));
  g.add(blob('#6a5a62', 0.11, [0, y + 0.16, 0.04]));
  for (const s of [1, -1]) {
    g.add(blob(c, 0.24, [s * 0.26, y + 0.06, -0.02], [1, 0.5, 0.1], [0, 0, s * -0.25]));
    g.add(cone('#6a5a62', 0.04, 0.1, [s * 0.06, y + 0.28, 0.02], [0, 0, s * -0.2]));
  }
  g.add(eyes(0.045, y + 0.18, 0.13, 0.02, '#e8c45a'));
  return g;
}

export function parrot(): THREE.Group {
  const g = new THREE.Group();
  for (const s of [1, -1]) g.add(limb('#8f8a80', 0.018, [s * 0.05, 0.12, 0], [s * 0.05, 0.02, 0.04]));
  g.add(blob('#3f7f86', 0.08, [0, 0.2, -0.16], [0.6, 0.25, 2.0], [0.9, 0, 0]));
  g.add(blob('#d0443a', 0.16, [0, 0.3, 0], [0.85, 1.25, 0.9]));
  for (const s of [1, -1]) g.add(blob('#3f7f86', 0.12, [s * 0.12, 0.3, -0.04], [0.3, 1, 1.1]));
  g.add(blob('#e8c45a', 0.05, [0.12, 0.38, 0.0], [0.3, 0.8, 1]));
  g.add(blob('#d0443a', 0.13, [0, 0.53, 0.04]));
  g.add(blob('#f2e6c8', 0.06, [0, 0.52, 0.16], [0.9, 1, 1]));
  g.add(cone('#2a221d', 0.035, 0.08, [0, 0.49, 0.2], [Math.PI / 2 + 0.6, 0, 0]));
  g.add(eyes(0.07, 0.57, 0.1, 0.022));
  return g;
}
