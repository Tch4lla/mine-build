/** Items lying in the world: bob, spin, fall onto blocks, and get picked up (or bound onto a tool with F). */
import * as THREE from 'three';
import { IS_SOLID } from '../world/blocks';
import type { World } from '../world/world';
import type { ItemStack } from '../items/inventory';
import { itemModel } from '../items/icons';

export interface DroppedItem {
  stack: ItemStack;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  /** Seconds before it can be picked up. */
  pickupDelay: number;
  mesh: THREE.Object3D;
}

export class DroppedItems {
  readonly group = new THREE.Group();
  readonly list: DroppedItem[] = [];

  constructor(private readonly world: World) {}

  drop(stack: ItemStack, pos: THREE.Vector3, vel = new THREE.Vector3(), pickupDelay = 0.6): DroppedItem {
    const mesh = itemModel(stack);
    mesh.scale.setScalar(0.35);
    const d: DroppedItem = {
      stack: { ...stack },
      pos: pos.clone(),
      vel: vel.clone(),
      age: 0,
      pickupDelay,
      mesh,
    };
    this.group.add(mesh);
    this.list.push(d);
    return d;
  }

  remove(d: DroppedItem): void {
    this.group.remove(d.mesh);
    const i = this.list.indexOf(d);
    if (i >= 0) this.list.splice(i, 1);
  }

  /** Nearest dropped item within `range` of a ray. */
  pick(eye: THREE.Vector3, dir: THREE.Vector3, range: number): DroppedItem | null {
    let best: DroppedItem | null = null;
    let bestD = Infinity;
    for (const d of this.list) {
      const to = d.pos
        .clone()
        .add(new THREE.Vector3(0, 0.2, 0))
        .sub(eye);
      const t = to.dot(dir);
      if (t < 0 || t > range) continue;
      const perp = to.addScaledVector(dir, -t).length();
      if (perp < 0.5 && t < bestD) {
        best = d;
        bestD = t;
      }
    }
    return best;
  }

  update(dt: number, time: number, playerPos: THREE.Vector3, collect: (stack: ItemStack) => number): void {
    for (const d of [...this.list]) {
      d.age += dt;
      d.vel.y -= 18 * dt;
      d.vel.x *= 1 - 2 * dt;
      d.vel.z *= 1 - 2 * dt;
      const next = d.pos.clone().addScaledVector(d.vel, dt);
      const below = this.world.getBlock(Math.floor(next.x), Math.floor(next.y), Math.floor(next.z));
      if (IS_SOLID[below]) {
        next.y = Math.floor(next.y) + 1;
        d.vel.set(0, 0, 0);
      }
      const side = this.world.getBlock(Math.floor(next.x), Math.floor(next.y + 0.1), Math.floor(next.z));
      if (IS_SOLID[side]) {
        next.x = d.pos.x;
        next.z = d.pos.z;
      }
      d.pos.copy(next);
      d.mesh.position.set(d.pos.x, d.pos.y + 0.25 + Math.sin(time * 3 + d.age) * 0.06, d.pos.z);
      d.mesh.rotation.y = time * 1.5 + d.age;

      if (
        d.age > d.pickupDelay &&
        d.pos.distanceTo(playerPos.clone().add(new THREE.Vector3(0, 0.6, 0))) < 1.6
      ) {
        const left = collect(d.stack);
        if (left <= 0) this.remove(d);
        else d.stack.count = left;
      }
      if (d.age > 600 || d.pos.y < -10) this.remove(d);
    }
  }

  serialize(): { stack: ItemStack; pos: number[] }[] {
    return this.list.map((d) => ({ stack: d.stack, pos: d.pos.toArray() }));
  }

  load(data: { stack: ItemStack; pos: number[] }[]): void {
    for (const d of [...this.list]) this.remove(d);
    for (const d of data) this.drop(d.stack, new THREE.Vector3().fromArray(d.pos), undefined, 0.5);
  }
}
