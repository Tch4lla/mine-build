/**
 * Pure (DOM-free) chunk mesher: hidden-face culling with per-vertex ambient occlusion.
 * Produces separate buffers for solid/cutout geometry and translucent geometry (water).
 */
import { BLOCKS, RENDER, WATER_STRENGTH } from './blocks';
import { CHUNK_HEIGHT, CHUNK_SIZE, ChunkData, MAX_BLOCK_ID } from './chunk';
import { tileIndex, tileUV } from './tiles';

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

/** Returns the block id at chunk-local coords; x/z may be -1..CHUNK_SIZE (neighbour chunks). */
export type BlockSampler = (x: number, y: number, z: number) => number;

interface FaceDef {
  n: [number, number, number];
  corners: [number, number, number][];
  shade: number;
  tile: 'top' | 'side' | 'bottom';
}

const FACES: FaceDef[] = [
  {
    n: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    shade: 0.8,
    tile: 'side',
  },
  {
    n: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    shade: 0.8,
    tile: 'side',
  },
  {
    n: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    shade: 1.0,
    tile: 'top',
  },
  {
    n: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    shade: 0.5,
    tile: 'bottom',
  },
  {
    n: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    shade: 0.65,
    tile: 'side',
  },
  {
    n: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    shade: 0.65,
    tile: 'side',
  },
];
const CORNER_UV: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];
const AO_LEVEL = [0.45, 0.65, 0.82, 1.0];

/** Precomputed per-block tile UVs for each face kind. */
const BLOCK_UVS = BLOCKS.map((b) => ({
  top: tileUV(tileIndex(b.tiles.top)),
  side: tileUV(tileIndex(b.tiles.side)),
  bottom: tileUV(tileIndex(b.tiles.bottom)),
}));

const FULL_BRIGHT = new Set(['lamp', 'crystal_ore']);
const BRIGHT = new Uint8Array(MAX_BLOCK_ID + 1);
for (const b of BLOCKS) BRIGHT[b.id] = FULL_BRIGHT.has(b.key) ? 1 : 0;

class Builder {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  idx: number[] = [];
  get faceCount(): number {
    return this.idx.length / 6;
  }
  build(): MeshData {
    return {
      positions: new Float32Array(this.pos),
      normals: new Float32Array(this.nor),
      uvs: new Float32Array(this.uv),
      colors: new Float32Array(this.col),
      indices: new Uint32Array(this.idx),
    };
  }
}

/** occluder: opaque or custom (custom blocks render as full cubes elsewhere). */
function occludes(id: number): boolean {
  const r = RENDER[id];
  return r === 1 || r === 4;
}

function faceVisible(self: number, nb: number): boolean {
  if (occludes(nb)) return false;
  const r = RENDER[self];
  if (r === 1) return true;
  // Source and flowing water count as one body of water.
  if (WATER_STRENGTH[self] && WATER_STRENGTH[nb]) return false;
  return nb !== self;
}

/** Height of a water block's surface: full under more water, otherwise lower the weaker the flow. */
function waterSurface(strength: number, waterAbove: boolean): number {
  if (waterAbove) return 1;
  return Math.max(0.12, (strength / 8) * 0.88);
}

export function meshChunk(chunk: ChunkData, sample: BlockSampler): { solid: MeshData; water: MeshData } {
  const solid = new Builder();
  const water = new Builder();
  const S = CHUNK_SIZE;

  // Padded copy (S+2)^2 x H for fast neighbour lookups.
  const P = S + 2;
  const H = CHUNK_HEIGHT;
  const pad = new Uint16Array(P * P * H);
  const pi = (x: number, y: number, z: number) => x + 1 + (z + 1) * P + y * P * P;
  for (let y = 0; y < H; y++) {
    for (let z = -1; z <= S; z++) {
      for (let x = -1; x <= S; x++) {
        const inside = x >= 0 && x < S && z >= 0 && z < S;
        pad[pi(x, y, z)] = inside ? chunk.get(x, y, z) : sample(x, y, z);
      }
    }
  }
  const at = (x: number, y: number, z: number): number => (y < 0 || y >= H ? 0 : pad[pi(x, y, z)]);
  const aoSolid = (x: number, y: number, z: number): number => (occludes(at(x, y, z)) ? 1 : 0);

  for (let y = 0; y < H; y++) {
    for (let z = 0; z < S; z++) {
      for (let x = 0; x < S; x++) {
        const id = at(x, y, z);
        const r = RENDER[id];
        if (r === 0 || r === 4) continue;
        const out = r === 3 ? water : solid;
        const uvs = BLOCK_UVS[id];
        const strength = WATER_STRENGTH[id];
        const isWater = strength > 0;
        const surface = isWater ? waterSurface(strength, WATER_STRENGTH[at(x, y + 1, z)] > 0) : 1;

        for (let f = 0; f < 6; f++) {
          const face = FACES[f];
          const [nx, ny, nz] = face.n;
          const nb = y + ny >= H ? 0 : y + ny < 0 ? 1 : at(x + nx, y + ny, z + nz);
          if (!faceVisible(id, nb)) continue;

          const [u0, v0, u1, v1] = uvs[face.tile];
          const base = out.pos.length / 3;
          const ao: number[] = [];
          for (let c = 0; c < 4; c++) {
            const [cx, cy, cz] = face.corners[c];
            let py = y + cy;
            if (cy === 1 && surface < 1) py -= 1 - surface;
            out.pos.push(x + cx, py, z + cz);
            out.nor.push(nx, ny, nz);
            const [cu, cv] = CORNER_UV[c];
            out.uv.push(u0 + (u1 - u0) * cu, v0 + (v1 - v0) * cv);

            let level = 3;
            if (!isWater && !BRIGHT[id]) {
              // Tangent offsets: move towards the corner along the two axes that aren't the normal.
              const ox = x + nx;
              const oy = y + ny;
              const oz = z + nz;
              const tx = nx === 0 ? (cx === 1 ? 1 : -1) : 0;
              const ty = ny === 0 ? (cy === 1 ? 1 : -1) : 0;
              const tz = nz === 0 ? (cz === 1 ? 1 : -1) : 0;
              // Split the two tangent axes into separate offset vectors.
              let s1: number, s2: number;
              if (nx !== 0) {
                s1 = aoSolid(ox, oy + ty, oz);
                s2 = aoSolid(ox, oy, oz + tz);
              } else if (ny !== 0) {
                s1 = aoSolid(ox + tx, oy, oz);
                s2 = aoSolid(ox, oy, oz + tz);
              } else {
                s1 = aoSolid(ox + tx, oy, oz);
                s2 = aoSolid(ox, oy + ty, oz);
              }
              const corner = aoSolid(ox + tx, oy + ty, oz + tz);
              level = s1 && s2 ? 0 : 3 - (s1 + s2 + corner);
            }
            ao.push(level);
            const b = BRIGHT[id] ? 1 : AO_LEVEL[level] * face.shade;
            out.col.push(b, b, b);
          }
          // Flip the quad diagonal to avoid anisotropic AO artifacts.
          if (ao[0] + ao[2] < ao[1] + ao[3]) {
            out.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
          } else {
            out.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
          }
        }
      }
    }
  }
  return { solid: solid.build(), water: water.build() };
}

/**
 * Grid coordinates (chunk-local) of solid blocks that touch a non-solid block.
 * Used to build Rapier voxel colliders; buried blocks are skipped to keep colliders small.
 */
export function exposedSolidVoxels(
  chunk: ChunkData,
  sample: BlockSampler,
  isSolid: (id: number) => boolean,
): Int32Array {
  const out: number[] = [];
  const S = CHUNK_SIZE;
  const get = (x: number, y: number, z: number): number => {
    if (y < 0) return 1;
    if (y >= CHUNK_HEIGHT) return 0;
    if (x < 0 || x >= S || z < 0 || z >= S) return sample(x, y, z);
    return chunk.get(x, y, z);
  };
  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let z = 0; z < S; z++) {
      for (let x = 0; x < S; x++) {
        if (!isSolid(chunk.get(x, y, z))) continue;
        if (
          !isSolid(get(x + 1, y, z)) ||
          !isSolid(get(x - 1, y, z)) ||
          !isSolid(get(x, y + 1, z)) ||
          !isSolid(get(x, y - 1, z)) ||
          !isSolid(get(x, y, z + 1)) ||
          !isSolid(get(x, y, z - 1))
        ) {
          out.push(x, y, z);
        }
      }
    }
  }
  return new Int32Array(out);
}
