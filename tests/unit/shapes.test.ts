import { describe, expect, it } from 'vitest';
import { BLOCKS, FULL_SOLID, IS_SOLID, blockByKey } from '../../src/world/blocks';
import { ChunkData } from '../../src/world/chunk';
import { meshChunk, shapeColliderBoxes } from '../../src/world/chunkMesher';
import { CONNECT, OPEN, TOP, facingFromYaw, rotateBox, shapeBoxes } from '../../src/world/shapes';
import { LIB_BLOCKS } from '../../src/generated/library';

const id = (key: string) => blockByKey(key)!.id;
const empty = () => 0;

describe('block shapes', () => {
  it('turns boxes clockwise seen from above', () => {
    // The north half of a block, turned once, becomes the east half.
    expect(rotateBox([0, 0, 0, 1, 1, 0.5], 1)).toEqual([0.5, 0, 0, 1, 1, 1]);
    expect(rotateBox([0, 0, 0, 1, 1, 0.5], 4)).toEqual([0, 0, 0, 1, 1, 0.5]);
  });

  it('reads facing from the player yaw', () => {
    expect(facingFromYaw(0)).toBe(0);
    expect(facingFromYaw(-Math.PI / 2)).toBe(1);
    expect(facingFromYaw(Math.PI)).toBe(2);
    expect(facingFromYaw(Math.PI / 2)).toBe(3);
  });

  it('builds slabs, stairs and doors from their state', () => {
    expect(shapeBoxes({ shape: 'slab', state: 0 })[0].box).toEqual([0, 0, 0, 1, 0.5, 1]);
    expect(shapeBoxes({ shape: 'slab', state: TOP })[0].box).toEqual([0, 0.5, 0, 1, 1, 1]);
    const stairsEast = shapeBoxes({ shape: 'stairs', state: 1 }).map((b) => b.box);
    expect(stairsEast).toContainEqual([0.5, 0.5, 0, 1, 1, 1]);
    const door = shapeBoxes({ shape: 'door', state: TOP })[0];
    expect(door.vOffset).toBe(0.5);
    expect(shapeBoxes({ shape: 'door', state: OPEN })[0].box[3]).toBeLessThan(0.25);
  });

  it('lets the player through open gates and over nothing it should not', () => {
    expect(shapeBoxes({ shape: 'fence_gate', state: OPEN }, true)).toEqual([]);
    expect(shapeBoxes({ shape: 'fence_gate', state: 0 }, true)[0].box[4]).toBe(1.5);
    expect(shapeBoxes({ shape: 'fence', state: 0, conn: CONNECT.n | CONNECT.e }, true)).toHaveLength(3);
    expect(shapeBoxes({ shape: 'cross', state: 0 })).toEqual([]);
  });
});

describe('library blocks in the registry', () => {
  it('registers every library block that is not a core look-alike', () => {
    const own = LIB_BLOCKS.filter((b) => !b.core);
    for (const b of own) expect(BLOCKS[b.blockId].key, b.id).toBe(b.key);
    const core = LIB_BLOCKS.filter((b) => b.core);
    for (const b of core) expect(blockByKey(b.core!)!.libTiles, b.id).toBeDefined();
  });

  it('gives plants and torches no collision and slabs no voxel collider', () => {
    expect(IS_SOLID[id('poppy')]).toBe(0);
    expect(IS_SOLID[id('oak_slab')]).toBe(1);
    expect(FULL_SOLID[id('oak_slab')]).toBe(0);
    expect(FULL_SOLID[id('stone_bricks')]).toBe(1);
  });
});

describe('meshing shaped blocks', () => {
  it('draws slabs, plants and fences and skips faces against opaque blocks', () => {
    const c = new ChunkData(0, 0);
    c.set(1, 1, 1, id('oak_slab'));
    c.set(3, 1, 1, id('poppy'));
    c.set(5, 1, 1, id('oak_fence'));
    c.set(6, 1, 1, id('oak_fence'));
    const { solid } = meshChunk(c, empty);
    expect(solid.indices.length).toBeGreaterThan(0);
    for (const v of solid.positions) expect(Number.isFinite(v)).toBe(true);
    const lone = new ChunkData(0, 0);
    lone.set(1, 1, 1, id('oak_slab'));
    const facesAlone = meshChunk(lone, empty).solid.indices.length / 6;
    lone.set(1, 0, 1, id('stone_bricks'));
    lone.set(2, 1, 1, id('stone_bricks'));
    // The slab's bottom and east side are now hidden. The bricks keep the faces that touch the
    // slab (5 for the one underneath, whose bottom is on the world floor, and 6 for the other).
    const after = meshChunk(lone, empty).solid.indices.length / 6;
    expect(facesAlone).toBe(6);
    expect(after).toBe(4 + 5 + 6);
  });

  it('collides with shaped blocks by their boxes', () => {
    const c = new ChunkData(0, 0);
    c.set(1, 1, 1, id('oak_slab'), TOP);
    c.set(4, 1, 4, id('poppy'));
    const boxes = shapeColliderBoxes(c, empty);
    expect(Array.from(boxes)).toEqual([1, 1.5, 1, 2, 2, 2]);
  });
});
