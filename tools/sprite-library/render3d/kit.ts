/** Building blocks for 3D creature models: rounded, toy-like parts with the game's toon shading. */
import * as THREE from 'three';
import { toonGradient } from '../../../src/engine/atlas';

const mats = new Map<string, THREE.MeshToonMaterial>();

export function toon(color: string): THREE.MeshToonMaterial {
  let m = mats.get(color);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() });
    mats.set(color, m);
  }
  return m;
}

type V3 = [number, number, number];

/** An ellipsoid: a sphere of radius r scaled by s, at p, rotated by rot (radians). */
export function blob(color: string, r: number, p: V3, s: V3 = [1, 1, 1], rot: V3 = [0, 0, 0]): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), toon(color));
  m.position.set(...p);
  m.scale.set(...s);
  m.rotation.set(...rot);
  return m;
}

/** A capsule (rounded limb or ear). */
export function capsule(
  color: string,
  r: number,
  len: number,
  p: V3,
  s: V3 = [1, 1, 1],
  rot: V3 = [0, 0, 0],
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 10, 24), toon(color));
  m.position.set(...p);
  m.scale.set(...s);
  m.rotation.set(...rot);
  return m;
}

/** A glossy eye: dark ball with a small white catch-light. */
export function eye(p: V3, r: number, look: V3): THREE.Group {
  const g = new THREE.Group();
  g.add(
    new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({ color: '#2a221d' })),
  );
  const hi = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.32, 12, 8),
    new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  );
  hi.position.set(look[0] * r * 0.55 - r * 0.25, r * 0.4, look[2] * r * 0.75);
  g.add(hi);
  g.position.set(...p);
  return g;
}
