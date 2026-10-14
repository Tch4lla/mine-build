import { describe, expect, it } from 'vitest';
import { IS_OPAQUE, LIGHT, STONE, blockByKey } from '../../src/world/blocks';
import { ChunkData } from '../../src/world/chunk';
import { meshChunk } from '../../src/world/chunkMesher';
import { spreadLight } from '../../src/world/light';

const opaque = (id: number) => IS_OPAQUE[id] === 1;

describe('block light', () => {
  it('fades one level per block from a source', () => {
    const at = spreadLight([{ x: 5, y: 10, z: 5, level: 15 }], () => 0, opaque);
    expect(at(5, 10, 5)).toBe(15);
    expect(at(6, 10, 5)).toBe(14);
    expect(at(5, 13, 5)).toBe(12);
    expect(at(8, 12, 7)).toBe(8); // 3 + 2 + 2 steps away
  });

  it('is stopped by opaque blocks and goes around them', () => {
    // A stone wall at x = 6 from y 0 to 20 between the light and the cell behind it.
    const wall = (x: number, y: number, z: number) => (x === 6 && y < 20 && Math.abs(z - 5) <= 3 ? STONE : 0);
    const at = spreadLight([{ x: 5, y: 10, z: 5, level: 15 }], wall, opaque);
    expect(at(6, 10, 5)).toBe(0);
    // Behind the wall, light arrives the long way round its edge (4 steps out, over and back).
    expect(at(7, 10, 5)).toBeLessThan(14);
    expect(at(7, 10, 5)).toBeGreaterThan(0);
  });

  it('crosses into neighbouring chunks', () => {
    // A lantern just inside the next chunk east still lights this chunk's border.
    const at = spreadLight([{ x: 17, y: 10, z: 5, level: 15 }], () => 0, opaque);
    expect(at(15, 10, 5)).toBe(13);
    expect(at(16, 10, 5)).toBe(14);
  });

  it('gives lanterns, torches, campfires and candles light', () => {
    for (const k of ['lantern', 'torch', 'campfire', 'white_candle', 'lamp'])
      expect(LIGHT[blockByKey(k)!.id], k).toBeGreaterThan(0);
  });

  it('lights the faces of blocks next to a light', () => {
    const c = new ChunkData(0, 0);
    c.set(4, 4, 4, STONE);
    c.set(14, 4, 4, STONE);
    const at = spreadLight([{ x: 5, y: 4, z: 4, level: 15 }], (x, y, z) => c.get(x, y, z), opaque);
    const { solid } = meshChunk(c, () => 0, at);
    // The stone beside the light is lit brightly; the far one hardly at all.
    let near = 0;
    let far = 0;
    for (let v = 0; v < solid.lights.length; v++) {
      const x = solid.positions[v * 3];
      if (x <= 5) near = Math.max(near, solid.lights[v]);
      else far = Math.max(far, solid.lights[v]);
    }
    expect(near).toBeGreaterThan(0.85);
    expect(far).toBeLessThan(0.45); // about 9 blocks away
    expect(meshChunk(c, () => 0).solid.lights.every((l) => l === 0)).toBe(true);
  });
});
