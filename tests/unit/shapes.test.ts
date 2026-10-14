import { describe, expect, it } from 'vitest';
import { BLOCKS, FULL_SOLID, IS_SOLID, blockByKey } from '../../src/world/blocks';
import { ChunkData } from '../../src/world/chunk';
import { meshChunk, shapeColliderBoxes, targetBounds } from '../../src/world/chunkMesher';
import {
  CONNECT,
  OPEN,
  TOP,
  facingFromYaw,
  partnerOffset,
  rotateBox,
  shapeBoxes,
} from '../../src/world/shapes';
import { LIB_BLOCKS } from '../../src/generated/library';
import { tileIndex, tileUV } from '../../src/world/tiles';

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

describe('two-block doors and beds', () => {
  it('finds the other half', () => {
    expect(partnerOffset('door', 0)).toEqual([0, 1, 0]);
    expect(partnerOffset('door', TOP)).toEqual([0, -1, 0]);
    // A bed placed looking east has its head one block east of the foot.
    expect(partnerOffset('bed', 1)).toEqual([1, 0, 0]);
    expect(partnerOffset('bed', 1 | TOP)).toEqual([-1, 0, 0]);
    expect(partnerOffset('slab', 0)).toBeNull();
  });

  it('draws a pillow only on the head, in wool', () => {
    expect(shapeBoxes({ shape: 'bed', state: 0 }).some((b) => b.tile === 'wool')).toBe(false);
    expect(shapeBoxes({ shape: 'bed', state: TOP }).some((b) => b.tile === 'wool')).toBe(true);
    expect(shapeBoxes({ shape: 'bed', state: 0 }, true)[0].box[4]).toBe(9 / 16);
  });

  it('registers library beds as beds', () => {
    expect(blockByKey('red_bed')!.shape).toBe('bed');
  });
});

describe('targeting outline', () => {
  const world = (blocks: Record<string, number>, states: Record<string, number> = {}) => ({
    get: (x: number, y: number, z: number) => blocks[`${x},${y},${z}`] ?? 0,
    state: (x: number, y: number, z: number) => states[`${x},${y},${z}`] ?? 0,
  });
  it('hugs slabs, plants and lone fences instead of the whole cell', () => {
    const w = world({ '0,0,0': id('oak_slab'), '1,0,0': id('poppy'), '2,0,0': id('oak_fence') });
    expect(targetBounds(w.get, w.state, 0, 0, 0)).toEqual([0, 0, 0, 1, 0.5, 1]);
    expect(targetBounds(w.get, w.state, 1, 0, 0)[0]).toBeGreaterThan(0);
    const fence = targetBounds(w.get, w.state, 2, 0, 0);
    expect(fence[3] - fence[0]).toBeLessThan(0.5);
    expect(targetBounds(w.get, w.state, 5, 5, 5)).toEqual([0, 0, 0, 1, 1, 1]);
  });
  it('stretches a fence towards the neighbours it joins', () => {
    const w = world({ '0,0,0': id('oak_fence'), '1,0,0': id('oak_fence') });
    expect(targetBounds(w.get, w.state, 0, 0, 0)[3]).toBe(1);
  });
});

describe('doors', () => {
  it('close on the side nearest the player and open against their left', () => {
    // Placed looking north: closed on the south edge, open against the west side.
    expect(shapeBoxes({ shape: 'door', state: 0 })[0].box).toEqual([0, 0, 13 / 16, 1, 1, 1]);
    expect(shapeBoxes({ shape: 'door', state: OPEN })[0].box).toEqual([0, 0, 0, 3 / 16, 1, 1]);
    // Placed looking east: closed on the west edge.
    const east = shapeBoxes({ shape: 'door', state: 1 })[0].box;
    expect(east[0]).toBe(0);
    expect(east[3]).toBeCloseTo(3 / 16);
  });

  it('block the doorway when closed and leave it clear when open', () => {
    const c = new ChunkData(0, 0);
    c.set(1, 1, 1, id('oak_door'));
    c.set(1, 2, 1, id('oak_door'), TOP);
    // Closed: a panel across the whole doorway on its south edge.
    expect(Array.from(shapeColliderBoxes(c, empty)).slice(0, 6)).toEqual([1, 1, 1 + 13 / 16, 2, 2, 2]);
    c.set(1, 1, 1, id('oak_door'), OPEN);
    c.set(1, 2, 1, id('oak_door'), OPEN | TOP);
    // Open: only a thin panel along the west side, so x 1.1875–2 is free to walk through.
    const open = Array.from(shapeColliderBoxes(c, empty));
    expect(open.slice(0, 6)).toEqual([1, 1, 1, 1 + 3 / 16, 2, 2]);
  });

  it('take their edges from their material', () => {
    // Oak planks are the library look of the core planks block.
    expect(blockByKey('oak_door')!.edgeOf).toBe(blockByKey('planks')!.id);
    expect(blockByKey('birch_door')!.edgeOf).toBe(blockByKey('birch_planks')!.id);
    expect(blockByKey('copper_door')!.edgeOf).toBe(blockByKey('copper_block')!.id);
    expect(blockByKey('iron_door')!.edgeOf).toBe(blockByKey('iron_block')!.id);
  });

  it('draw their edges, top and bottom with that material, not the door picture', () => {
    const c = new ChunkData(0, 0);
    c.set(1, 1, 1, id('oak_door'));
    const m = meshChunk(c, empty).solid;
    const [eu0, ev0, eu1, ev1] = tileUV(tileIndex(BLOCKS[blockByKey('oak_door')!.edgeOf!].tiles.side));
    let edgeVerts = 0;
    for (let i = 0; i < m.uvs.length; i += 2) {
      const [u, v] = [m.uvs[i], m.uvs[i + 1]];
      if (u >= eu0 - 1e-6 && u <= eu1 + 1e-6 && v >= ev0 - 1e-6 && v <= ev1 + 1e-6) edgeVerts++;
    }
    expect(edgeVerts).toBe(4 * 4); // two sides, top and bottom
  });
});
