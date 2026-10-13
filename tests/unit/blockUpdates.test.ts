import { describe, expect, it } from 'vitest';
import { AIR, SAND, STONE, WATER, WATER_STRENGTH } from '../../src/world/blocks';
import { BlockUpdates, type VoxelAccess } from '../../src/world/blockUpdates';

/** A tiny in-memory world that schedules neighbours on every change, like the real World does. */
function fakeWorld() {
  const blocks = new Map<string, number>();
  const k = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const ref: { updates?: BlockUpdates } = {};
  const world: VoxelAccess & {
    fill: (x0: number, x1: number, y: number, z0: number, z1: number, id: number) => void;
  } = {
    getBlock: (x, y, z) => blocks.get(k(x, y, z)) ?? AIR,
    setBlock: (x, y, z, id) => {
      if ((blocks.get(k(x, y, z)) ?? AIR) === id) return;
      blocks.set(k(x, y, z), id);
      ref.updates!.scheduleAround(x, y, z);
    },
    isLoaded: () => true,
    fill(x0, x1, y, z0, z1, id) {
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) blocks.set(k(x, y, z), id);
    },
  };
  const updates = new BlockUpdates(world);
  ref.updates = updates;
  return { world, updates };
}

describe('water', () => {
  it('fills a hole dug next to a lake with a new source', () => {
    const { world, updates } = fakeWorld();
    world.fill(-5, 5, 0, -5, 5, STONE); // floor
    world.fill(-5, 0, 1, -5, 5, WATER); // lake on the west half
    world.fill(1, 5, 1, -5, 5, STONE); // shore
    world.setBlock(1, 1, 0, AIR); // dig a pocket into the shore
    updates.settle();
    expect(world.getBlock(1, 1, 0)).toBe(WATER); // fills level with the lake
    world.setBlock(2, 1, 0, AIR); // keep digging inland
    updates.settle();
    expect(world.getBlock(2, 1, 0)).toBe(WATER);
  });

  it('flows into an open channel without turning it into a lake', () => {
    const { world, updates } = fakeWorld();
    world.fill(-5, 12, 0, -5, 5, STONE);
    world.fill(-5, 0, 1, -5, 5, WATER);
    world.fill(1, 12, 1, -5, 5, STONE);
    for (let x = 1; x <= 12; x++) world.setBlock(x, 1, 0, AIR); // a long open trench
    world.setBlock(1, 1, 1, AIR); // and a side opening, so the trench isn't walled in
    updates.settle();
    expect(WATER_STRENGTH[world.getBlock(5, 1, 0)]).toBeLessThan(8);
    expect(world.getBlock(12, 1, 0)).toBe(AIR); // runs out of strength before the end
  });

  it('spreads out over a flat floor, getting weaker with distance', () => {
    const { world, updates } = fakeWorld();
    world.fill(-10, 10, 0, -10, 10, STONE);
    world.setBlock(0, 1, 0, WATER);
    updates.scheduleAround(0, 1, 0);
    updates.settle();
    expect(WATER_STRENGTH[world.getBlock(1, 1, 0)]).toBe(7);
    expect(WATER_STRENGTH[world.getBlock(3, 1, 0)]).toBe(5);
    expect(WATER_STRENGTH[world.getBlock(7, 1, 0)]).toBe(1);
    expect(world.getBlock(8, 1, 0)).toBe(AIR);
  });

  it('falls down a drop instead of spreading at the top', () => {
    const { world, updates } = fakeWorld();
    world.fill(-5, 5, 0, -5, 5, STONE);
    world.fill(-5, 0, 4, -5, 5, STONE); // a ledge 4 blocks up on the west
    world.setBlock(0, 5, 0, WATER); // source on the ledge edge
    updates.scheduleAround(0, 5, 0);
    updates.settle();
    expect(WATER_STRENGTH[world.getBlock(1, 5, 0)]).toBe(7); // spills over the edge…
    expect(WATER_STRENGTH[world.getBlock(1, 1, 0)]).toBe(7); // …and falls to the floor
    expect(world.getBlock(2, 5, 0)).toBe(AIR); // no floating sheet of water
  });

  it('recedes when the source is removed', () => {
    const { world, updates } = fakeWorld();
    world.fill(-10, 10, 0, -10, 10, STONE);
    world.setBlock(0, 1, 0, WATER);
    updates.scheduleAround(0, 1, 0);
    updates.settle();
    world.setBlock(0, 1, 0, STONE);
    updates.settle();
    for (let x = -8; x <= 8; x++) expect(WATER_STRENGTH[world.getBlock(x, 1, 0)]).toBe(0);
  });
});

describe('falling blocks', () => {
  it('drops sand when the block under it is removed, including a stack', () => {
    const { world, updates } = fakeWorld();
    const falls: number[] = [];
    updates.onFall = (_x, y) => falls.push(y);
    world.fill(0, 0, 0, 0, 0, STONE);
    world.fill(0, 0, 1, 0, 0, STONE);
    world.fill(0, 0, 2, 0, 0, SAND);
    world.fill(0, 0, 3, 0, 0, SAND);
    world.setBlock(0, 1, 0, AIR);
    updates.settle();
    expect(falls.sort()).toEqual([2, 3]);
    expect(world.getBlock(0, 2, 0)).toBe(AIR);
    expect(world.getBlock(0, 3, 0)).toBe(AIR);
  });

  it('leaves supported sand alone', () => {
    const { world, updates } = fakeWorld();
    world.fill(0, 0, 0, 0, 0, STONE);
    world.setBlock(0, 1, 0, SAND);
    updates.settle();
    expect(world.getBlock(0, 1, 0)).toBe(SAND);
  });
});
