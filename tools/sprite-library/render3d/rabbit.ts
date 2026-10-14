/** Sōzō rabbit: a sitting, rounded rabbit (faces +z). */
import * as THREE from 'three';
import { blob, capsule, eye } from './kit';

const COAT = '#c8a888';
const CREAM = '#f2e6d0';
const PINK = '#e9a0b4';

export function rabbit(): THREE.Group {
  const g = new THREE.Group();
  // Haunches and body (sitting pear shape).
  g.add(blob(COAT, 0.42, [0, 0.4, -0.12], [1, 0.92, 1.08]));
  g.add(blob(COAT, 0.22, [0.27, 0.3, -0.12], [0.9, 1, 1.2]));
  g.add(blob(COAT, 0.22, [-0.27, 0.3, -0.12], [0.9, 1, 1.2]));
  g.add(blob(CREAM, 0.28, [0, 0.5, 0.17], [0.95, 1.05, 0.85]));
  // Feet and front paws.
  g.add(blob(COAT, 0.1, [0.24, 0.06, 0.06], [1, 0.6, 2.2]));
  g.add(blob(COAT, 0.1, [-0.24, 0.06, 0.06], [1, 0.6, 2.2]));
  // Front legs: short and sturdy, rising out of the chest so the paws are joined to the body.
  for (const side of [1, -1]) {
    g.add(capsule(CREAM, 0.07, 0.2, [side * 0.12, 0.22, 0.3], [1, 1, 1], [0.18, 0, 0]));
    g.add(blob(CREAM, 0.08, [side * 0.12, 0.07, 0.34], [1, 0.75, 1.3]));
  }
  // Tail.
  g.add(blob('#f8f2e8', 0.13, [0, 0.36, -0.58]));
  // Head.
  g.add(blob(COAT, 0.29, [0, 0.86, 0.26], [1, 0.92, 1.02]));
  g.add(blob(CREAM, 0.12, [0.07, 0.77, 0.5], [1, 0.85, 0.8]));
  g.add(blob(CREAM, 0.12, [-0.07, 0.77, 0.5], [1, 0.85, 0.8]));
  g.add(blob(PINK, 0.035, [0, 0.84, 0.57]));
  g.add(eye([0.17, 0.92, 0.44], 0.055, [0.5, 0, 1]));
  g.add(eye([-0.17, 0.92, 0.44], 0.055, [0.5, 0, 1]));
  // Ears: long, flattened capsules with a pink inner, tipped slightly back and out.
  for (const side of [1, -1]) {
    const ear = new THREE.Group();
    ear.add(capsule(COAT, 0.075, 0.42, [0, 0.25, 0], [1.25, 1, 0.5]));
    ear.add(capsule(PINK, 0.045, 0.34, [0, 0.25, 0.03], [1.2, 1, 0.4]));
    ear.position.set(side * 0.1, 1.04, 0.2);
    ear.rotation.set(-0.28, 0, side * -0.22);
    g.add(ear);
  }
  return g;
}
