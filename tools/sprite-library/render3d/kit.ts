/** Building blocks for 3D creature models: rounded, toy-like parts with the game's toon shading. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { toonGradient } from '../../../src/engine/atlas';

const mats = new Map<string, THREE.Material>();

export function toon(color: string, opts: { flat?: boolean; opacity?: number } = {}): THREE.Material {
  const key = `${color}|${opts.flat ? 1 : 0}|${opts.opacity ?? 1}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({
      color,
      gradientMap: toonGradient(),
      flatShading: !!opts.flat,
      transparent: opts.opacity !== undefined && opts.opacity < 1,
      opacity: opts.opacity ?? 1,
    });
    mats.set(key, m);
  }
  return m;
}

export type V3 = [number, number, number];

function place<T extends THREE.Object3D>(o: T, p: V3, s: V3 = [1, 1, 1], rot: V3 = [0, 0, 0]): T {
  o.position.set(...p);
  o.scale.set(...s);
  o.rotation.set(...rot);
  return o;
}

/** An ellipsoid: a sphere of radius r scaled by s, at p, rotated by rot (radians). */
export function blob(
  color: string,
  r: number,
  p: V3 = [0, 0, 0],
  s: V3 = [1, 1, 1],
  rot: V3 = [0, 0, 0],
): THREE.Mesh {
  return place(new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), toon(color)), p, s, rot);
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
  return place(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 10, 24), toon(color)), p, s, rot);
}

/** A capsule running from point a to point b. */
export function limb(color: string, r: number, a: V3, b: V3, s: V3 = [1, 1, 1]): THREE.Mesh {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len), 8, 20), toon(color));
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.scale.set(...s);
  return m;
}

export function cone(
  color: string,
  r: number,
  h: number,
  p: V3,
  rot: V3 = [0, 0, 0],
  s: V3 = [1, 1, 1],
): THREE.Mesh {
  return place(new THREE.Mesh(new THREE.ConeGeometry(r, h, 28), toon(color)), p, s, rot);
}

export function cyl(
  color: string,
  rTop: number,
  rBot: number,
  h: number,
  p: V3,
  rot: V3 = [0, 0, 0],
  s: V3 = [1, 1, 1],
): THREE.Mesh {
  return place(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 32), toon(color)), p, s, rot);
}

export function rbox(
  color: string,
  w: number,
  h: number,
  d: number,
  radius: number,
  p: V3,
  rot: V3 = [0, 0, 0],
): THREE.Mesh {
  return place(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, radius), toon(color)), p, [1, 1, 1], rot);
}

export function torus(
  color: string,
  R: number,
  r: number,
  p: V3,
  rot: V3 = [0, 0, 0],
  arc = Math.PI * 2,
  s: V3 = [1, 1, 1],
): THREE.Mesh {
  return place(new THREE.Mesh(new THREE.TorusGeometry(R, r, 16, 48, arc), toon(color)), p, s, rot);
}

/** A glossy eye: dark ball with a small white catch-light facing the camera side. */
export function eye(p: V3, r: number, look: V3 = [0.5, 0, 1], color = '#2a221d'): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({ color })));
  const hi = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.32, 12, 8),
    new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  );
  hi.position.set(look[0] * r * 0.55 - r * 0.15, r * 0.4, look[2] * r * 0.75);
  g.add(hi);
  return place(g, p);
}

/** Two eyes, mirrored across x. */
export function eyes(x: number, y: number, z: number, r: number, color?: string): THREE.Group {
  const g = new THREE.Group();
  g.add(eye([x, y, z], r, [0.5, 0, 1], color), eye([-x, y, z], r, [0.5, 0, 1], color));
  return g;
}

export function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  g.add(...children);
  return g;
}

// --- four-legged template --------------------------------------------------------------------------

export interface QuadSpec {
  coat: string;
  legColor?: string;
  hoof?: string;
  body: V3; // ellipsoid radii (x, y, z)
  legLen: number;
  legR: number;
  head: { r: number; y: number; z: number; s?: V3 };
  neck?: boolean;
  legSpread?: number; // 0..1 of body radius
}

/**
 * Builds a standing four-legged animal facing +z. Returns the root group and a head group whose
 * local origin is the head centre (face toward +z), so faces can be added in head space.
 */
export function quad(o: QuadSpec): { g: THREE.Group; head: THREE.Group; bodyY: number } {
  const g = new THREE.Group();
  const [rx, ry, rz] = o.body;
  const bodyY = o.legLen + ry * 0.55;
  g.add(blob(o.coat, 1, [0, bodyY, 0], [rx, ry, rz]));
  const spread = o.legSpread ?? 0.55;
  const lc = o.legColor ?? o.coat;
  for (const sx of [1, -1])
    for (const sz of [1, -1]) {
      const x = sx * rx * spread;
      const z = sz * rz * 0.6;
      g.add(limb(lc, o.legR, [x, bodyY - ry * 0.3, z], [x, o.legR, z]));
      if (o.hoof) g.add(cyl(o.hoof, o.legR * 1.05, o.legR * 1.15, o.legR * 1.1, [x, o.legR * 0.55, z]));
    }
  const head = new THREE.Group();
  head.position.set(0, o.head.y, o.head.z);
  head.add(blob(o.coat, o.head.r, [0, 0, 0], o.head.s ?? [1, 1, 1]));
  if (o.neck)
    g.add(
      limb(
        o.coat,
        o.head.r * 0.62,
        [0, bodyY + ry * 0.35, rz * 0.62],
        [0, o.head.y - o.head.r * 0.3, o.head.z - o.head.r * 0.3],
      ),
    );
  g.add(head);
  return { g, head, bodyY };
}
