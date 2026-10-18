/** What sits on shelves: each stored item is shown standing in its compartment. */
import * as THREE from 'three';
import { BLOCKS } from '../world/blocks';
import { facingOf, shelfSlotSpot } from '../world/shapes';
import type { World } from '../world/world';
import type { ItemStack } from '../items/inventory';
import { itemModel } from '../items/icons';

/** Size of an item on a shelf (models are about 1 block across); a compartment is 4/16 tall. */
const ITEM_SCALE = 0.22;

interface Display {
  /** What it was built from (facing and items), to tell when it needs rebuilding. */
  sig: string;
  group: THREE.Group;
}

export class ShelfDisplays {
  readonly group = new THREE.Group();
  private readonly shown = new Map<string, Display>();

  constructor(private readonly world: World) {}

  /** Brings the displays in line with the shelves' contents. Cheap when nothing has changed. */
  update(containers: ReadonlyMap<string, readonly (ItemStack | null)[]>): void {
    for (const [key, d] of this.shown)
      if (!containers.has(key)) {
        this.group.remove(d.group);
        this.shown.delete(key);
      }
    for (const [key, slots] of containers) {
      const [x, y, z] = key.split(',').map(Number);
      const isShelf = BLOCKS[this.world.getBlock(x, y, z)].shape === 'shelf';
      const facing = facingOf(this.world.getBlockState(x, y, z));
      const sig = isShelf ? `${facing}|${slots.map((s) => (s ? s.id : '')).join(',')}` : '';
      const old = this.shown.get(key);
      if (old?.sig === sig) continue;
      if (old) this.group.remove(old.group);
      this.shown.delete(key);
      if (!isShelf || slots.every((s) => !s)) continue;
      const g = new THREE.Group();
      g.position.set(x + 0.5, y, z + 0.5);
      // Shelf boxes are turned a quarter clockwise (seen from above) per facing step.
      g.rotation.y = (-facing * Math.PI) / 2;
      slots.forEach((s, i) => {
        if (!s || i > 8) return;
        const m = itemModel(s);
        m.scale.setScalar(ITEM_SCALE);
        const [sx, sy, sz] = shelfSlotSpot(i);
        m.position.set(sx - 0.5, sy + ITEM_SCALE / 2, sz - 0.5);
        g.add(m);
      });
      this.group.add(g);
      this.shown.set(key, { sig, group: g });
    }
  }
}
