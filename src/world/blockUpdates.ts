/**
 * Scheduled block updates: flowing water and falling blocks (sand, gravel).
 *
 * Water uses a "pull" model. Each scheduled cell works out how strong its water should be from
 * its neighbours, and changes itself if needed; the change schedules the neighbours in turn, so
 * water spreads out one step per tick and recedes the same way when its source is cut off.
 *   - Water above (any strength) feeds a falling column of strength 7.
 *   - A horizontal neighbour feeds strength - 1, but only if it rests on something solid or on a
 *     source (water that can still fall doesn't spread sideways).
 *   - Over solid ground (or a source), a cell becomes a new source when two neighbours are
 *     sources, or when one is and the cell is otherwise walled in, so a pocket dug into a lake
 *     shore fills up completely instead of sitting slightly lower than the lake.
 */
import { AIR, FALLS, IS_SOLID, WATER_STRENGTH, waterOfStrength } from './blocks';

export interface VoxelAccess {
  getBlock(x: number, y: number, z: number): number;
  setBlock(x: number, y: number, z: number, id: number): unknown;
  /** Whether the chunk holding (x, z) is loaded (updates wait for unloaded chunks). */
  isLoaded(x: number, z: number): boolean;
}

/** Seconds between water steps, and before an unsupported block starts to fall. */
export const WATER_TICK = 0.25;
export const GRAVITY_TICK = 0.05;

const SIDES: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

export class BlockUpdates {
  private readonly due = new Map<string, { x: number; y: number; z: number; t: number }>();
  private time = 0;
  /** Called when a block starts falling (the block has already been removed). */
  onFall: (x: number, y: number, z: number, id: number) => void = () => undefined;

  constructor(private readonly world: VoxelAccess) {}

  get pending(): number {
    return this.due.size;
  }

  schedule(x: number, y: number, z: number, delay: number): void {
    const k = key(x, y, z);
    const t = this.time + delay;
    const cur = this.due.get(k);
    if (!cur || cur.t > t) this.due.set(k, { x, y, z, t });
  }

  /** Schedule a changed cell and its six neighbours. */
  scheduleAround(x: number, y: number, z: number): void {
    this.schedule(x, y, z, GRAVITY_TICK);
    this.schedule(x, y + 1, z, GRAVITY_TICK);
    this.schedule(x, y - 1, z, WATER_TICK);
    for (const [dx, dz] of SIDES) this.schedule(x + dx, y, z + dz, WATER_TICK);
  }

  /** Advances time and runs due updates, at most `budget` per call. */
  step(dt: number, budget = 400): void {
    this.time += dt;
    let n = 0;
    for (const [k, u] of this.due) {
      if (n >= budget) break;
      if (u.t > this.time) continue;
      this.due.delete(k);
      n++;
      this.update(u.x, u.y, u.z);
    }
  }

  /** Runs updates until nothing is pending (tests and tools). */
  settle(maxSteps = 10_000): void {
    for (let i = 0; i < maxSteps && this.due.size > 0; i++) this.step(WATER_TICK, Infinity);
  }

  private update(x: number, y: number, z: number): void {
    if (y < 0) return;
    const w = this.world;
    if (!w.isLoaded(x, z) || SIDES.some(([dx, dz]) => !w.isLoaded(x + dx, z + dz))) {
      this.schedule(x, y, z, 1);
      return;
    }
    const id = w.getBlock(x, y, z);

    if (FALLS[id]) {
      const below = w.getBlock(x, y - 1, z);
      if (y > 0 && (below === AIR || WATER_STRENGTH[below] > 0)) {
        w.setBlock(x, y, z, AIR);
        this.onFall(x, y, z, id);
      }
      return;
    }

    const cur = WATER_STRENGTH[id];
    if (cur === 8) return; // sources never change on their own
    if (id !== AIR && cur === 0) return; // solid or other block

    const target = this.waterTarget(x, y, z);
    if (target !== cur) w.setBlock(x, y, z, waterOfStrength(target));
  }

  /** The water strength this cell should have, given its neighbours. */
  waterTarget(x: number, y: number, z: number): number {
    const w = this.world;
    const below = w.getBlock(x, y - 1, z);
    const onFirmGround = IS_SOLID[below] === 1 || WATER_STRENGTH[below] === 8;

    let sources = 0;
    let best = 0;
    let open = false; // a horizontal neighbour that isn't a wall or a source
    for (const [dx, dz] of SIDES) {
      const nid = w.getBlock(x + dx, y, z + dz);
      const n = WATER_STRENGTH[nid];
      // Anything but a wall or a source counts as open (flowing water included).
      if (n !== 8 && !IS_SOLID[nid]) open = true;
      if (!n) continue;
      if (n === 8) sources++;
      const nBelow = w.getBlock(x + dx, y - 1, z + dz);
      const canSpread = IS_SOLID[nBelow] === 1 || WATER_STRENGTH[nBelow] === 8;
      if (canSpread) best = Math.max(best, n - 1);
    }
    if (onFirmGround && (sources >= 2 || (sources === 1 && !open))) return 8;
    if (WATER_STRENGTH[w.getBlock(x, y + 1, z)] > 0) best = Math.max(best, 7);
    return best;
  }
}
