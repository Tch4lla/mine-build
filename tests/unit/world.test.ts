import { describe, expect, it } from 'vitest';
import { AIR, GLASS, STONE, WATER } from '../../src/world/blocks';
import {
  CHUNK_VOLUME,
  ChunkData,
  MAX_BLOCK_ID,
  MAX_STATE,
  blockId,
  blockState,
  packBlock,
  rleDecode,
  rleDecodeV1,
  rleEncode,
} from '../../src/world/chunk';
import { exposedSolidVoxels, meshChunk } from '../../src/world/chunkMesher';
import { raycastVoxels } from '../../src/world/raycast';
import { TerrainGenerator } from '../../src/world/terrain';

const empty = () => AIR;
const faces = (m: { indices: Uint32Array }) => m.indices.length / 6;

describe('chunk mesher', () => {
  it('meshes a single block with 6 faces', () => {
    const c = new ChunkData(0, 0);
    c.set(5, 10, 5, STONE);
    const { solid, water } = meshChunk(c, empty);
    expect(faces(solid)).toBe(6);
    expect(faces(water)).toBe(0);
    expect(solid.positions.length).toBe(6 * 4 * 3);
  });

  it('culls faces between adjacent opaque blocks', () => {
    const c = new ChunkData(0, 0);
    c.set(5, 10, 5, STONE);
    c.set(6, 10, 5, STONE);
    expect(faces(meshChunk(c, empty).solid)).toBe(10);
  });

  it('draws opaque faces behind glass but culls glass-glass faces', () => {
    const c = new ChunkData(0, 0);
    c.set(5, 10, 5, STONE);
    c.set(6, 10, 5, GLASS);
    c.set(7, 10, 5, GLASS);
    // stone: 6 faces (face toward glass still visible); glass pair: 10 faces minus the one touching stone = 9
    expect(faces(meshChunk(c, empty).solid)).toBe(6 + 9);
  });

  it('puts water in the translucent buffer and culls water-water faces', () => {
    const c = new ChunkData(0, 0);
    c.set(1, 1, 1, WATER);
    c.set(2, 1, 1, WATER);
    const { solid, water } = meshChunk(c, empty);
    expect(faces(solid)).toBe(0);
    expect(faces(water)).toBe(10);
  });

  it('uses neighbour samples at chunk borders', () => {
    const c = new ChunkData(0, 0);
    c.set(15, 10, 5, STONE);
    const neighbourSolid = (x: number, y: number, z: number) =>
      x === 16 && y === 10 && z === 5 ? STONE : AIR;
    expect(faces(meshChunk(c, neighbourSolid).solid)).toBe(5);
  });

  it('only reports exposed solid voxels for colliders', () => {
    const c = new ChunkData(0, 0);
    for (let x = 0; x < 3; x++)
      for (let y = 1; y < 4; y++) for (let z = 0; z < 3; z++) c.set(x + 4, y, z + 4, STONE);
    const vox = exposedSolidVoxels(c, empty, (id) => id === STONE);
    expect(vox.length / 3).toBe(26); // 27 minus the buried centre
  });
});

describe('RLE', () => {
  it('round-trips chunk data', () => {
    const data = new TerrainGenerator(42).generate(1, -2).blocks;
    const enc = rleEncode(data);
    expect(enc.length).toBeLessThan(data.byteLength / 4);
    expect(rleDecode(enc)).toEqual(data);
  });
  it('handles runs longer than 65535', () => {
    const data = new Uint16Array(200_000);
    data[1000] = 3;
    expect(rleDecode(rleEncode(data), data.length)).toEqual(data);
  });
  it('keeps ids above 255 and state bits', () => {
    const data = new Uint16Array(CHUNK_VOLUME);
    data[5] = packBlock(811, 9);
    data[6] = packBlock(MAX_BLOCK_ID, MAX_STATE);
    expect(rleDecode(rleEncode(data))).toEqual(data);
  });
  it('decodes version 1 (8-bit) data', () => {
    const v1 = Uint8Array.from([255, 17, 255, 17, 1, 13, 255, 0]);
    const out = rleDecodeV1(v1, 766);
    expect(out[0]).toBe(17);
    expect(out[510]).toBe(13);
    expect(out[511]).toBe(0);
  });
});

describe('block state', () => {
  it('packs an id and a state into one cell', () => {
    const v = packBlock(700, 5);
    expect(blockId(v)).toBe(700);
    expect(blockState(v)).toBe(5);
    expect(blockState(packBlock(STONE))).toBe(0);
  });
  it('reads the id and the state separately', () => {
    const c = new ChunkData(0, 0);
    c.set(1, 2, 3, STONE, 6);
    expect(c.get(1, 2, 3)).toBe(STONE);
    expect(c.getState(1, 2, 3)).toBe(6);
    c.set(1, 2, 3, STONE);
    expect(c.getState(1, 2, 3)).toBe(0);
  });
});

describe('terrain', () => {
  it('is deterministic for a seed', () => {
    const a = new TerrainGenerator(1234).generate(3, 7).blocks;
    const b = new TerrainGenerator(1234).generate(3, 7).blocks;
    expect(a).toEqual(b);
    const c = new TerrainGenerator(999).generate(3, 7).blocks;
    expect(a).not.toEqual(c);
  });
  it('has bedrock at the bottom and air at the top', () => {
    const c = new TerrainGenerator(5).generate(0, 0);
    expect(c.get(0, 0, 0)).not.toBe(AIR);
    expect(c.get(0, 127, 0)).toBe(AIR);
  });
});

describe('voxel raycast', () => {
  const grid = (x: number, y: number, z: number) => (x === 3 && y === 0 && z === 0 ? STONE : AIR);
  it('hits a block along +x with the right normal', () => {
    const hit = raycastVoxels(0.5, 0.5, 0.5, 1, 0, 0, 10, grid, (id) => id !== AIR);
    expect(hit).toMatchObject({ x: 3, y: 0, z: 0, nx: -1, ny: 0, nz: 0 });
    expect(hit!.distance).toBeCloseTo(2.5);
  });
  it('misses beyond max distance', () => {
    expect(raycastVoxels(0.5, 0.5, 0.5, 1, 0, 0, 2, grid, (id) => id !== AIR)).toBeNull();
  });
  it('hits from above with an up normal', () => {
    const hit = raycastVoxels(3.5, 5, 0.5, 0, -1, 0, 10, grid, (id) => id !== AIR);
    expect(hit).toMatchObject({ x: 3, y: 0, z: 0, nx: 0, ny: 1, nz: 0 });
  });
});
