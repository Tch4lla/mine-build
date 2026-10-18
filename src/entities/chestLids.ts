/** Chest lids swinging open while a chest is in use, and shut again afterwards. */
import * as THREE from 'three';
import { meshBoxes } from '../world/chunkMesher';
import { CHEST_SEAM, chestLidBox, chestStretch, facingOf, type Box } from '../world/shapes';
import type { World } from '../world/world';

/** How far an open lid tips back (radians) and how long it takes to get there (seconds). */
const OPEN_ANGLE = 1.45;
const SWING_TIME = 0.25;

interface Lid {
  /** Turns about the lid's hinge (its local x axis). */
  hinge: THREE.Group;
  /** 0 shut … 1 open. */
  t: number;
  opening: boolean;
  /** Called once the lid has shut (the chunk draws the lid again). */
  onShut: () => void;
}

export class ChestLids {
  readonly group = new THREE.Group();
  private readonly lids = new Map<string, Lid>();

  constructor(private readonly world: World) {}

  /** Whether the chest at this position has a lid of its own out (open or swinging). */
  has(x: number, y: number, z: number): boolean {
    return this.lids.has(`${x},${y},${z}`);
  }

  /** Swings the lid of the chest at (x, y, z) open; `joined` is its side of a double chest. */
  open(x: number, y: number, z: number, joined: 'left' | 'right' | null, onShut: () => void): void {
    const key = `${x},${y},${z}`;
    const old = this.lids.get(key);
    if (old) {
      old.opening = true;
      old.onShut = onShut;
      return;
    }
    const id = this.world.getBlock(x, y, z);
    const f = facingOf(this.world.getBlockState(x, y, z));
    // The lid is built facing north, with its hinge edge moved to the origin so it can turn about
    // it, then the whole thing is turned to the chest's facing about the block's centre.
    const [x0, y0, z0, x1, y1, z1] = chestLidBox(joined);
    const hz = z0;
    const box: Box = [x0, y0, z0, x1, y1, z1];
    const data = meshBoxes(id, [{ box, stretch: joined ? chestStretch(box, 0) : undefined }]);
    const geo = this.world.toGeometry(data);
    geo.translate(-0.5, -CHEST_SEAM, -hz);
    const mesh = new THREE.Mesh(geo, this.world.solidMaterial);
    const hinge = new THREE.Group();
    hinge.position.set(0, CHEST_SEAM, hz - 0.5);
    hinge.add(mesh);
    const turn = new THREE.Group();
    turn.position.set(x + 0.5, y, z + 0.5);
    // As rotateBox turns boxes: a quarter turn clockwise (seen from above) per facing step.
    turn.rotation.y = (-f * Math.PI) / 2;
    turn.add(hinge);
    this.group.add(turn);
    this.lids.set(key, { hinge, t: 0, opening: true, onShut });
  }

  /** Lets the lid of the chest at (x, y, z) swing shut. */
  close(x: number, y: number, z: number): void {
    const lid = this.lids.get(`${x},${y},${z}`);
    if (lid) lid.opening = false;
  }

  update(dt: number): void {
    for (const [key, lid] of this.lids) {
      lid.t = THREE.MathUtils.clamp(lid.t + (lid.opening ? dt : -dt) / SWING_TIME, 0, 1);
      // Eased, so the lid slows as it reaches either end.
      const e = lid.t * lid.t * (3 - 2 * lid.t);
      lid.hinge.rotation.x = -e * OPEN_ANGLE;
      if (!lid.opening && lid.t === 0) {
        this.group.remove(lid.hinge.parent!);
        lid.hinge.children.forEach((m) => (m as THREE.Mesh).geometry.dispose());
        this.lids.delete(key);
        lid.onShut();
      }
    }
  }
}
