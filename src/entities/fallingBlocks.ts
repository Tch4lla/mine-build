/** Blocks that are falling (sand, gravel): a cube that drops under gravity and lands as a block. */
import * as THREE from 'three';
import { AIR, BLOCKS, IS_SOLID, WATER_STRENGTH } from '../world/blocks';
import type { World } from '../world/world';
import { itemModel } from '../items/icons';

interface Falling {
  id: number;
  x: number;
  z: number;
  /** Height of the block's bottom face. */
  y: number;
  vy: number;
  mesh: THREE.Object3D;
}

export class FallingBlocks {
  readonly group = new THREE.Group();
  private readonly list: Falling[] = [];
  /** Called when a falling block can't land (e.g. onto a torch-like spot); the game drops an item. */
  onBlocked: (id: number, pos: THREE.Vector3) => void = () => undefined;

  constructor(private readonly world: World) {}

  get count(): number {
    return this.list.length;
  }

  spawn(x: number, y: number, z: number, id: number): void {
    const mesh = itemModel({ id: BLOCKS[id].key });
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.group.add(mesh);
    this.list.push({ id, x, z, y, vy: 0, mesh });
  }

  update(dt: number): void {
    for (const f of [...this.list]) {
      f.vy = Math.max(f.vy - 30 * dt, -40);
      let next = f.y + f.vy * dt;
      // Land on the first solid block below.
      const startCell = Math.floor(f.y);
      const endCell = Math.floor(next);
      let landed = false;
      for (let cy = startCell - 1; cy >= endCell - 1; cy--) {
        if (cy < 0 || IS_SOLID[this.world.getBlock(f.x, cy, f.z)]) {
          next = Math.max(next, cy + 1);
          landed = cy < 0 || next <= cy + 1;
          break;
        }
      }
      f.y = next;
      f.mesh.position.y = f.y + 0.5;
      if (landed || f.y < -16) this.land(f);
    }
  }

  private land(f: Falling): void {
    this.group.remove(f.mesh);
    this.list.splice(this.list.indexOf(f), 1);
    const y = Math.round(f.y);
    const cur = this.world.getBlock(f.x, y, f.z);
    if (y >= 0 && (cur === AIR || WATER_STRENGTH[cur] > 0)) this.world.setBlock(f.x, y, f.z, f.id);
    else this.onBlocked(f.id, new THREE.Vector3(f.x + 0.5, y + 0.5, f.z + 0.5));
  }
}
