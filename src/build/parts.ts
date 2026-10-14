/** Tether part definitions: physics shape, mass, behaviour and a procedural mesh. */
import * as THREE from 'three';

export type PartBehavior = 'none' | 'fan' | 'rocket' | 'balloon' | 'wheel' | 'seat' | 'spring' | 'light';

export type PartShape =
  | { type: 'box'; hx: number; hy: number; hz: number }
  | { type: 'ball'; radius: number }
  /** Cylinder along local X (wheels). */
  | { type: 'cylinderX'; halfHeight: number; radius: number }
  /** Cylinder along local Y. */
  | { type: 'cylinderY'; halfHeight: number; radius: number };

export interface PartDef {
  id: string;
  itemId: string;
  name: string;
  shape: PartShape;
  mass: number;
  friction: number;
  restitution: number;
  behavior: PartBehavior;
  /** Can be switched on/off by hitting it or from a seat. */
  activatable: boolean;
  buildMesh(): THREE.Object3D;
}

const lambert = (color: number, extra: Partial<THREE.MeshLambertMaterialParameters> = {}) =>
  new THREE.MeshLambertMaterial({ color, ...extra });

function box(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
  m.position.set(x, y, z);
  return m;
}

/** Simple plank texture so boards and crates read as wood. */
let woodTex: THREE.CanvasTexture | null = null;
function woodTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  if (!woodTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#b08654';
    ctx.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y++) {
      ctx.fillStyle = `rgba(90,60,30,${0.08 + ((y * 7) % 5) * 0.03})`;
      ctx.fillRect(0, y, 32, 1);
    }
    ctx.fillStyle = 'rgba(70,45,20,0.6)';
    ctx.fillRect(0, 0, 32, 1);
    ctx.fillRect(0, 31, 32, 1);
    woodTex = new THREE.CanvasTexture(c);
    woodTex.magFilter = THREE.NearestFilter;
    woodTex.colorSpace = THREE.SRGBColorSpace;
  }
  return woodTex;
}

export const PARTS: Record<string, PartDef> = {
  board: {
    id: 'board',
    itemId: 'part_board',
    name: 'Wooden Board',
    shape: { type: 'box', hx: 1, hy: 0.075, hz: 0.5 },
    mass: 6,
    friction: 0.8,
    restitution: 0.05,
    behavior: 'none',
    activatable: false,
    buildMesh: () => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(2, 0.15, 1), lambert(0xffffff, { map: woodTexture() }));
      return m;
    },
  },
  crate: {
    id: 'crate',
    itemId: 'part_crate',
    name: 'Crate',
    shape: { type: 'box', hx: 0.45, hy: 0.45, hz: 0.45 },
    mass: 8,
    friction: 0.8,
    restitution: 0.05,
    behavior: 'none',
    activatable: false,
    buildMesh: () => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), lambert(0xffffff, { map: woodTexture() })));
      for (const s of [-1, 1]) {
        g.add(box(0.92, 0.08, 0.08, 0x6b4421, 0, s * 0.42, 0.42));
        g.add(box(0.92, 0.08, 0.08, 0x6b4421, 0, s * 0.42, -0.42));
        g.add(box(0.08, 0.92, 0.08, 0x6b4421, s * 0.42, 0, 0.42));
        g.add(box(0.08, 0.92, 0.08, 0x6b4421, s * 0.42, 0, -0.42));
      }
      return g;
    },
  },
  wheel: {
    id: 'wheel',
    itemId: 'part_wheel',
    name: 'Wheel',
    // The physical "wheel" is a raycast wheel; this small collider only acts as a bump stop.
    shape: { type: 'cylinderX', halfHeight: 0.14, radius: 0.28 },
    mass: 3,
    friction: 0.9,
    restitution: 0.1,
    behavior: 'wheel',
    activatable: false,
    buildMesh: () => {
      const g = new THREE.Group();
      const spin = new THREE.Group();
      spin.name = 'spin';
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.28, 18), lambert(0x2b2b2b));
      tire.rotation.z = Math.PI / 2;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 12), lambert(0xb08654));
      hub.rotation.z = Math.PI / 2;
      const spoke = box(0.31, 0.08, 0.7, 0x6b4421);
      spin.add(tire, hub, spoke);
      g.add(spin);
      return g;
    },
  },
  fan: {
    id: 'fan',
    itemId: 'part_fan',
    name: 'Fan',
    shape: { type: 'box', hx: 0.4, hy: 0.4, hz: 0.2 },
    mass: 4,
    friction: 0.6,
    restitution: 0.05,
    behavior: 'fan',
    activatable: true,
    buildMesh: () => {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.4), lambert(0x3a4a5a));
      g.add(frame);
      const blades = new THREE.Group();
      blades.name = 'spin';
      for (let i = 0; i < 4; i++) {
        const b = box(0.12, 0.34, 0.03, 0xd8eaff, 0, 0.18, 0);
        const pivot = new THREE.Group();
        pivot.rotation.z = (i * Math.PI) / 2;
        b.rotation.y = 0.4;
        pivot.add(b);
        blades.add(pivot);
      }
      blades.position.z = 0.22;
      g.add(blades);
      // Arrow marking the thrust direction (+Z pushes, air blows out of -Z).
      g.add(box(0.1, 0.1, 0.1, 0x5aa0d8, 0, 0, -0.24));
      return g;
    },
  },
  rocket: {
    id: 'rocket',
    itemId: 'part_rocket',
    name: 'Rocket',
    shape: { type: 'cylinderY', halfHeight: 0.4, radius: 0.18 },
    mass: 2,
    friction: 0.5,
    restitution: 0.05,
    behavior: 'rocket',
    activatable: true,
    buildMesh: () => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.8, 12), lambert(0xe8e8e8)));
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.3, 12), lambert(0xd84a3a));
      nose.position.y = 0.55;
      g.add(nose);
      for (let i = 0; i < 3; i++) {
        const fin = box(0.04, 0.25, 0.2, 0xd84a3a, 0, -0.3, 0.2);
        const pivot = new THREE.Group();
        pivot.rotation.y = (i * Math.PI * 2) / 3;
        pivot.add(fin);
        g.add(pivot);
      }
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.7, 10),
        new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.85 }),
      );
      flame.rotation.x = Math.PI;
      flame.position.y = -0.75;
      flame.name = 'flame';
      flame.visible = false;
      g.add(flame);
      return g;
    },
  },
  balloon: {
    id: 'balloon',
    itemId: 'part_balloon',
    name: 'Balloon',
    shape: { type: 'ball', radius: 0.6 },
    mass: 0.5,
    friction: 0.4,
    restitution: 0.3,
    behavior: 'balloon',
    activatable: false,
    buildMesh: () => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), lambert(0xff6fa8)));
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 8), lambert(0xd84a88));
      knot.position.y = -0.62;
      g.add(knot);
      return g;
    },
  },
  seat: {
    id: 'seat',
    itemId: 'part_seat',
    name: 'Seat',
    shape: { type: 'box', hx: 0.35, hy: 0.25, hz: 0.35 },
    mass: 5,
    friction: 0.8,
    restitution: 0.05,
    behavior: 'seat',
    activatable: false,
    buildMesh: () => {
      const g = new THREE.Group();
      g.add(box(0.7, 0.2, 0.7, 0x3d5a80, 0, -0.05, 0));
      g.add(box(0.7, 0.55, 0.12, 0x34506f, 0, 0.3, 0.3)); // backrest at +Z: the seat faces -Z
      g.add(box(0.6, 0.15, 0.6, 0x6b4421, 0, -0.2, 0));
      // Little steering stick in front.
      g.add(box(0.05, 0.3, 0.05, 0x333333, 0, 0.1, -0.3));
      g.add(box(0.2, 0.05, 0.05, 0x333333, 0, 0.25, -0.3));
      return g;
    },
  },
  spring: {
    id: 'spring',
    itemId: 'part_spring',
    name: 'Spring',
    shape: { type: 'cylinderY', halfHeight: 0.2, radius: 0.35 },
    mass: 2,
    friction: 0.8,
    restitution: 0.3,
    behavior: 'spring',
    activatable: true,
    buildMesh: () => {
      const g = new THREE.Group();
      g.add(
        new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 16), lambert(0x666666)).translateY(-0.17),
      );
      const coil = new THREE.Group();
      coil.name = 'coil';
      for (let i = 0; i < 4; i++) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 6, 16), lambert(0xc0c0c0));
        t.rotation.x = Math.PI / 2;
        t.position.y = -0.1 + i * 0.07;
        coil.add(t);
      }
      g.add(coil);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 16), lambert(0xd84a3a));
      top.position.y = 0.17;
      top.name = 'top';
      g.add(top);
      return g;
    },
  },
  light: {
    id: 'light',
    itemId: 'part_light',
    name: 'Light',
    shape: { type: 'ball', radius: 0.25 },
    mass: 0.8,
    friction: 0.5,
    restitution: 0.2,
    behavior: 'light',
    activatable: true,
    buildMesh: () =>
      new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xfff2a8 }),
      ),
  },
};

export function partByItem(itemId: string): PartDef | undefined {
  return Object.values(PARTS).find((p) => p.itemId === itemId);
}

/** Rough bounding radius of a part, for spawn spacing. */
export function partRadius(def: PartDef): number {
  const s = def.shape;
  if (s.type === 'box') return Math.hypot(s.hx, s.hy, s.hz);
  if (s.type === 'ball') return s.radius;
  return Math.hypot(s.halfHeight, s.radius);
}
