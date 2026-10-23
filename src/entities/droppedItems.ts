/** Items lying in the world: bob, spin, fall onto blocks, and get picked up (or bound onto a tool with F). */
import * as THREE from 'three';
import { IS_SOLID } from '../world/blocks';
import type { World } from '../world/world';
import type { ItemStack } from '../items/inventory';
import { itemModel } from '../items/icons';

/** How far from the player's body items are drawn in, and how close they are collected. */
const MAGNET_RANGE = 2.5;
const COLLECT_RANGE = 1.1;
/** Blocks per second an item is drawn in at. */
const MAGNET_SPEED = 8;
/** Feet to eyes. */
const BODY_HEIGHT = 1.62;

/**
 * Whether an item moving into the solid block whose bottom is at `cellY` lands on top of it: only
 * when it came from above, so a thrown item stops at a wall instead of climbing it.
 */
export function landsOn(prevY: number, cellY: number): boolean {
  return prevY >= cellY + 1 - 0.05;
}

export interface DroppedItem {
  stack: ItemStack;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  /** Seconds before it can be picked up. */
  pickupDelay: number;
  /** The inventory had no room for it: left alone until the player walks away and comes back. */
  full?: boolean;
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
    // The player's body, feet to eyes: items are picked up from anywhere along it.
    const feet = playerPos;
    const chest = playerPos.clone().add(new THREE.Vector3(0, 1, 0));
    for (const d of [...this.list]) {
      d.age += dt;
      const toBody = (p: THREE.Vector3) =>
        p.distanceTo(
          new THREE.Vector3(feet.x, THREE.MathUtils.clamp(p.y, feet.y, feet.y + BODY_HEIGHT), feet.z),
        );
      const ready = d.age > d.pickupDelay && !d.full;
      if (ready && toBody(d.pos) < MAGNET_RANGE) {
        // Drawn in towards the player, through blocks, so nothing ends up out of reach on a ledge,
        // on a roof or under someone flying.
        const pull = chest.clone().sub(d.pos);
        const step = Math.min(pull.length(), MAGNET_SPEED * dt);
        d.pos.addScaledVector(pull.normalize(), step);
        d.vel.set(0, 0, 0);
      } else {
        d.vel.y -= 18 * dt;
        d.vel.x *= 1 - 2 * dt;
        d.vel.z *= 1 - 2 * dt;
        const next = d.pos.clone().addScaledVector(d.vel, dt);
        const cell = (p: THREE.Vector3) =>
          this.world.getBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
        if (IS_SOLID[cell(next)]) {
          if (landsOn(d.pos.y, Math.floor(next.y))) {
            // Falling onto the top of a block: rest on it.
            next.y = Math.floor(next.y) + 1;
            d.vel.set(0, 0, 0);
          } else {
            // Hitting its side: stop going sideways instead of climbing it.
            next.x = d.pos.x;
            next.z = d.pos.z;
            d.vel.x = 0;
            d.vel.z = 0;
          }
        }
        d.pos.copy(next);
      }
      d.mesh.position.set(d.pos.x, d.pos.y + 0.25 + Math.sin(time * 3 + d.age) * 0.06, d.pos.z);
      d.mesh.rotation.y = time * 1.5 + d.age;

      if (ready && toBody(d.pos) < COLLECT_RANGE) {
        const left = collect(d.stack);
        if (left <= 0) this.remove(d);
        else {
          // No room for the rest: it stays where it is until there is.
          d.stack.count = left;
          d.full = true;
        }
      }
      if (d.full && d.age > d.pickupDelay && toBody(d.pos) > MAGNET_RANGE) d.full = false;
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
