import RAPIER from '@dimforge/rapier3d-compat';

export { RAPIER };

/** Collision group bits. */
export const GROUP = {
  TERRAIN: 1 << 0,
  PLAYER: 1 << 1,
  PART: 1 << 2,
  MOB: 1 << 3,
  ITEM: 1 << 4,
} as const;

/** Rapier interaction groups: membership in the high 16 bits, filter in the low 16 bits. */
export function groups(member: number, filter: number): number {
  return ((member & 0xffff) << 16) | (filter & 0xffff);
}

export const GROUPS = {
  terrain: groups(GROUP.TERRAIN, 0xffff),
  player: groups(GROUP.PLAYER, GROUP.TERRAIN | GROUP.PART | GROUP.MOB),
  part: groups(GROUP.PART, GROUP.TERRAIN | GROUP.PART | GROUP.MOB | GROUP.PLAYER | GROUP.ITEM),
  mob: groups(GROUP.MOB, GROUP.TERRAIN | GROUP.PART | GROUP.MOB | GROUP.PLAYER),
  item: groups(GROUP.ITEM, GROUP.TERRAIN | GROUP.PART),
};

export const FIXED_DT = 1 / 60;

let initPromise: Promise<void> | null = null;
export function initPhysics(): Promise<void> {
  initPromise ??= RAPIER.init();
  return initPromise;
}

export class Physics {
  readonly world: RAPIER.World;
  readonly eventQueue: RAPIER.EventQueue;
  private accumulator = 0;

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = FIXED_DT;
    this.eventQueue = new RAPIER.EventQueue(true);
  }

  /** Steps the simulation with a fixed timestep; calls `beforeStep` before every substep. */
  step(dt: number, beforeStep: (dt: number) => void): number {
    this.accumulator += Math.min(dt, 0.1);
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < 5) {
      beforeStep(FIXED_DT);
      this.world.step(this.eventQueue);
      this.accumulator -= FIXED_DT;
      steps++;
    }
    if (steps === 5) this.accumulator = 0;
    return steps;
  }
}
