/**
 * Pure (DOM-free) chunk mesher: hidden-face culling with per-vertex ambient occlusion.
 * Produces separate buffers for solid/cutout geometry and translucent geometry (water).
 */
import { BLOCKS, FULL_SOLID, IS_SOLID, RENDER, WATER_STRENGTH } from './blocks';
import type { LightSampler } from './light';
import {
  connectGroup,
  doorHingeRight,
  facingOf,
  shapeBoxes,
  type BlockShape,
  type Box,
  type ShapeBox,
} from './shapes';
import { CHUNK_HEIGHT, CHUNK_SIZE, ChunkData, MAX_BLOCK_ID } from './chunk';
import { tileIndex, tileUV } from './tiles';

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  /** Block light (torches, lanterns...) per vertex, 0–1. */
  lights: Float32Array;
  indices: Uint32Array;
}

/** Returns the block id at chunk-local coords; x/z may be -1..CHUNK_SIZE (neighbour chunks). */
export type BlockSampler = (x: number, y: number, z: number) => number;
/** Like BlockSampler, for state bits; x/z may reach a little further into neighbour chunks. */
export type StateSampler = (x: number, y: number, z: number) => number;

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

/** Per-block tile UVs for each face kind (recomputed when the art style changes). */
type UV = [number, number, number, number];
let BLOCK_UVS: { top: UV; side: UV; bottom: UV }[] = [];
export function refreshBlockUVs(): void {
  BLOCK_UVS = BLOCKS.map((b) => ({
    top: tileUV(tileIndex(b.tiles.top)),
    side: tileUV(tileIndex(b.tiles.side)),
    bottom: tileUV(tileIndex(b.tiles.bottom)),
  }));
}
refreshBlockUVs();

/** UVs of a named tile on every face (box tile overrides such as a bed's pillow). */
const tileUVCache = new Map<string, { top: UV; side: UV; bottom: UV }>();
function tileUVs(name: string): { top: UV; side: UV; bottom: UV } {
  let t = tileUVCache.get(name);
  if (!t) {
    const uv = tileUV(tileIndex(name));
    t = { top: uv, side: uv, bottom: uv };
    tileUVCache.set(name, t);
  }
  return t;
}

/** Blocks drawn unshaded: the lamp, glowing ore and library blocks that give off light. */
const FULL_BRIGHT = new Set(['lamp', 'crystal_ore']);
const BRIGHT = new Uint8Array(MAX_BLOCK_ID + 1);
for (const b of BLOCKS) BRIGHT[b.id] = FULL_BRIGHT.has(b.key) || (b.light ?? 0) >= 10 ? 1 : 0;

/** Shape by id ('cube' for blocks that don't set one). */
const SHAPE: BlockShape[] = [];
for (const b of BLOCKS) SHAPE[b.id] = b.shape ?? 'cube';
const GROUP = SHAPE.map(connectGroup);

/** Which horizontal neighbours a fence, wall or pane joins (CONNECT bits n, e, s, w). */
function connections(
  at: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number,
  group: string,
): number {
  let c = 0;
  const joins = (nb: number) => GROUP[nb] === group || FULL_SOLID[nb] === 1;
  if (joins(at(x, y, z - 1))) c |= 1;
  if (joins(at(x + 1, y, z))) c |= 2;
  if (joins(at(x, y, z + 1))) c |= 4;
  if (joins(at(x - 1, y, z))) c |= 8;
  return c;
}

/** The boxes a non-cube block is drawn (or collides) with. */
function blockShapeBoxes(
  stateAt: (x: number, y: number, z: number) => number,
  at: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number,
  id: number,
  collision: boolean,
  /** Block ids further away than `at` reaches (a row of doors), defaulting to `at`. */
  far: (x: number, y: number, z: number) => number = at,
): ShapeBox[] {
  const shape = SHAPE[id];
  const group = GROUP[id];
  const state = stateAt(x, y, z);
  return shapeBoxes(
    {
      shape,
      state,
      conn: group ? connections(at, x, y, z, group) : 0,
      hingeRight:
        shape === 'door' &&
        doorHingeRight(state, (dx, dz) =>
          SHAPE[far(x + dx, y, z + dz)] === 'door' ? facingOf(stateAt(x + dx, y, z + dz)) : -1,
        ),
      box: BLOCKS[id].box,
      edgeTile: BLOCKS[id].edgeOf !== undefined ? BLOCKS[BLOCKS[id].edgeOf!].tiles.side : undefined,
      frameTile: BLOCKS[id].edgeOf !== undefined ? BLOCKS[BLOCKS[id].edgeOf!].tiles.side : undefined,
      doorTiles: BLOCKS[id].doorTiles,
    },
    collision,
  );
}

/**
 * The boxes (block space) a block is drawn with, for its targeting outline: null for full cubes,
 * empty for pictures (plants, torches, signs), which get no outline.
 */
export function targetBoxes(
  getBlock: (x: number, y: number, z: number) => number,
  getState: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number,
): Box[] | null {
  const id = getBlock(x, y, z);
  const shape = SHAPE[id] ?? 'cube';
  if (shape === 'cube') return null;
  if (shape === 'cross' || shape === 'flat') return [];
  const at = (dx: number, dy: number, dz: number) => getBlock(x + dx, y + dy, z + dz);
  const st = (dx: number, dy: number, dz: number) => getState(x + dx, y + dy, z + dz);
  return blockShapeBoxes(st, at, 0, 0, 0, id, false).map((b) => b.box);
}

/**
 * The box (block space, [x0, y0, z0, x1, y1, z1]) that outlines a block when the player aims at
 * it: the union of its drawn boxes, a slim upright box for plants and signs, the full cell for
 * cubes.
 */
export function targetBounds(
  getBlock: (x: number, y: number, z: number) => number,
  getState: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number,
): Box {
  const id = getBlock(x, y, z);
  const shape = SHAPE[id] ?? 'cube';
  if (shape === 'cube') return [0, 0, 0, 1, 1, 1];
  if (shape === 'cross' || shape === 'flat') return [0.15, 0, 0.15, 0.85, 0.9, 0.85];
  const at = (dx: number, dy: number, dz: number) => getBlock(x + dx, y + dy, z + dz);
  const st = (dx: number, dy: number, dz: number) => getState(x + dx, y + dy, z + dz);
  const out: Box = [1, 1, 1, 0, 0, 0];
  for (const { box: b } of blockShapeBoxes(st, at, 0, 0, 0, id, false))
    for (let i = 0; i < 3; i++) {
      out[i] = Math.min(out[i], b[i]);
      out[i + 3] = Math.max(out[i + 3], Math.min(1, b[i + 3]));
    }
  return out[3] > out[0] ? out : [0, 0, 0, 1, 1, 1];
}

/**
 * Texture coordinates (0–1 within the tile) of a point on face f of a box, matching the cube
 * faces' orientation so a slab shows the lower half of its side texture, not a squashed one.
 */
function faceUV(f: number, px: number, py: number, pz: number): [number, number] {
  switch (f) {
    case 0:
      return [1 - pz, py];
    case 1:
      return [pz, py];
    case 2:
      return [px, 1 - pz];
    case 3:
      return [px, pz];
    case 4:
      return [px, py];
    default:
      return [1 - px, py];
  }
}

/** Is face f of box b no more than 3/16 wide (a thin panel's edge, top or bottom)? */
function narrowFace(f: number, b: Box): boolean {
  const w = [b[3] - b[0], b[4] - b[1], b[5] - b[2]];
  // The face spans the two axes other than its normal's.
  const axis = f < 2 ? 0 : f < 4 ? 1 : 2;
  return w.some((v, i) => i !== axis && v <= 3 / 16 + 1e-6);
}

/** Is face f of box b on the block's boundary (so a neighbour can hide it)? */
function onBoundary(f: number, b: Box): boolean {
  switch (f) {
    case 0:
      return b[3] >= 1;
    case 1:
      return b[0] <= 0;
    case 2:
      return b[4] >= 1;
    case 3:
      return b[1] <= 0;
    case 4:
      return b[5] >= 1;
    default:
      return b[2] <= 0;
  }
}

class Builder {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  /** Block light per vertex, 0–1. */
  li: number[] = [];
  /** Block light for the shaped block being emitted (all its vertices). */
  light = 0;
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
      lights: new Float32Array(this.li),
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

export function meshChunk(
  chunk: ChunkData,
  sample: BlockSampler,
  lightAt?: LightSampler,
  sampleState?: StateSampler,
): { solid: MeshData; water: MeshData } {
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
  const stateOf = stateReader(chunk, sampleState);
  const far = (x: number, y: number, z: number): number =>
    x < -1 || x > S || z < -1 || z > S ? sample(x, y, z) : at(x, y, z);

  for (let y = 0; y < H; y++) {
    for (let z = 0; z < S; z++) {
      for (let x = 0; x < S; x++) {
        const id = at(x, y, z);
        const r = RENDER[id];
        if (r === 0 || r === 4) continue;
        if (SHAPE[id] !== 'cube') {
          solid.light = lightAt ? lightAt(x, y, z) / 15 : 0;
          if (SHAPE[id] === 'cross') emitCross(solid, x, y, z, BLOCK_UVS[id].side, BRIGHT[id] ? 1 : 0.92);
          else if (SHAPE[id] === 'flat')
            emitFlat(solid, x, y, z, BLOCK_UVS[id].side, chunk.getState(x, y, z) & 1, BRIGHT[id] ? 1 : 0.92);
          else emitBoxes(solid, x, y, z, id, blockShapeBoxes(stateOf, at, x, y, z, id, false, far), at);
          continue;
        }
        const out = r === 3 ? water : solid;
        const uvs = BLOCK_UVS[id];
        const strength = WATER_STRENGTH[id];
        const isWater = strength > 0;
        // Water's top corners are shared with the neighbouring water cells, so flowing water forms
        // one continuous slope instead of a staircase of separate boxes.
        const corner = (cx: number, cz: number): number => {
          let h = 0;
          for (let dz = cz - 1; dz <= cz; dz++)
            for (let dx = cx - 1; dx <= cx; dx++) {
              const w = WATER_STRENGTH[at(x + dx, y, z + dz)];
              if (!w) continue;
              if (WATER_STRENGTH[at(x + dx, y + 1, z + dz)]) return 1;
              h = Math.max(h, waterSurface(w, false));
            }
          return h;
        };

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
            const py = isWater && cy === 1 ? y + corner(cx, cz) : y + cy;
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
            out.li.push(
              lightAt ? cornerLight(lightAt, at, x + nx, y + ny, z + nz, nx, ny, nz, cx, cy, cz) : 0,
            );
          }
          // Flip the quad diagonal to avoid anisotropic AO artifacts.
          if (ao[0] + ao[2] < ao[1] + ao[3]) {
            out.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
          } else {
            out.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
          }
          // Water is drawn front faces only, so each face blends once; its surface also faces down,
          // so it can be seen from underwater.
          if (isWater && ny === 1) out.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
        }
      }
    }
  }
  return { solid: solid.build(), water: water.build() };
}

/**
 * Light at one corner of a cube face: the average over the cell in front of the face and the
 * (non-opaque) cells beside it towards that corner, so light fades smoothly across faces.
 */
function cornerLight(
  lightAt: LightSampler,
  at: (x: number, y: number, z: number) => number,
  ox: number,
  oy: number,
  oz: number,
  nx: number,
  ny: number,
  nz: number,
  cx: number,
  cy: number,
  cz: number,
): number {
  const tx = nx === 0 ? (cx === 1 ? 1 : -1) : 0;
  const ty = ny === 0 ? (cy === 1 ? 1 : -1) : 0;
  const tz = nz === 0 ? (cz === 1 ? 1 : -1) : 0;
  // The two tangent steps and their diagonal, as in the ambient occlusion above.
  const a: [number, number, number] = nx !== 0 ? [0, ty, 0] : [tx, 0, 0];
  const b: [number, number, number] = nz !== 0 ? [0, ty, 0] : [0, 0, tz];
  let sum = lightAt(ox, oy, oz);
  let n = 1;
  for (const [dx, dy, dz] of [a, b, [a[0] + b[0], a[1] + b[1], a[2] + b[2]]]) {
    if (occludes(at(ox + dx, oy + dy, oz + dz))) continue;
    sum += lightAt(ox + dx, oy + dy, oz + dz);
    n++;
  }
  return sum / n / 15;
}

/** Boxes of a shaped block, with faces against an opaque neighbour left out. */
function emitBoxes(
  out: Builder,
  x: number,
  y: number,
  z: number,
  id: number,
  boxes: ShapeBox[],
  at: (x: number, y: number, z: number) => number,
): void {
  const bright = BRIGHT[id] === 1;
  for (const { box: b, vOffset = 0, vScale = 1, tile, edgeTile, flipU, shade = 1 } of boxes) {
    const uvs = tile ? tileUVs(tile) : BLOCK_UVS[id];
    for (let f = 0; f < 6; f++) {
      const face = FACES[f];
      const [nx, ny, nz] = face.n;
      if (onBoundary(f, b) && occludes(at(x + nx, y + ny, z + nz))) continue;
      const edge = edgeTile !== undefined && narrowFace(f, b);
      const [u0, v0, u1, v1] = edge ? tileUVs(edgeTile).side : uvs[face.tile];
      const base = out.pos.length / 3;
      for (const [cx, cy, cz] of face.corners) {
        const px = cx ? b[3] : b[0];
        const py = Math.min(1, cy ? b[4] : b[1]);
        const pz = cz ? b[5] : b[2];
        out.pos.push(x + px, y + py, z + pz);
        out.nor.push(nx, ny, nz);
        const [fu, fv] = faceUV(f, px, py, pz);
        const tu = flipU && !edge ? 1 - fu : fu;
        const tv = ny === 0 && !edge ? vOffset + fv * vScale : fv;
        out.uv.push(u0 + (u1 - u0) * tu, v0 + (v1 - v0) * tv);
        const c = bright ? 1 : face.shade * shade;
        out.col.push(c, c, c);
        out.li.push(out.light);
      }
      out.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
}

/** Two crossed, double-sided quads showing the block's sprite (plants, torches, lanterns...). */
function emitCross(out: Builder, x: number, y: number, z: number, uv: UV, shade: number): void {
  emitQuads(out, x, y, z, uv, shade, [
    [0.15, 0.15, 0.85, 0.85],
    [0.15, 0.85, 0.85, 0.15],
  ]);
}

/** One double-sided quad across the block, facing north–south (or east–west when `sideways`). */
function emitFlat(
  out: Builder,
  x: number,
  y: number,
  z: number,
  uv: UV,
  sideways: number,
  shade: number,
): void {
  emitQuads(out, x, y, z, uv, shade, [sideways ? [0.5, 1, 0.5, 0] : [0, 0.5, 1, 0.5]]);
}

/** Upright, double-sided sprite quads from (ax, az) to (bx, bz) across the block. */
function emitQuads(
  out: Builder,
  x: number,
  y: number,
  z: number,
  uv: UV,
  shade: number,
  planes: [number, number, number, number][],
): void {
  const [u0, v0, u1, v1] = uv;
  for (const [ax, az, bx, bz] of planes) {
    const base = out.pos.length / 3;
    const corners: [number, number, number, number, number][] = [
      [ax, 0, az, 0, 0],
      [bx, 0, bz, 1, 0],
      [bx, 1, bz, 1, 1],
      [ax, 1, az, 0, 1],
    ];
    for (const [cx, cy, cz, cu, cv] of corners) {
      out.pos.push(x + cx, y + cy, z + cz);
      // An upward normal lights both sides alike.
      out.nor.push(0, 1, 0);
      out.uv.push(u0 + (u1 - u0) * cu, v0 + (v1 - v0) * cv);
      out.col.push(shade, shade, shade);
      out.li.push(out.light);
    }
    out.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    out.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
}

/** State bits at chunk-local coords, reaching into neighbour chunks through `sampleState`. */
function stateReader(chunk: ChunkData, sampleState?: StateSampler) {
  return (x: number, y: number, z: number): number =>
    x >= 0 && x < CHUNK_SIZE && z >= 0 && z < CHUNK_SIZE
      ? chunk.getState(x, y, z)
      : (sampleState?.(x, y, z) ?? 0);
}

/**
 * Collision boxes (chunk-local, [x0, y0, z0, x1, y1, z1] per box) of solid blocks that aren't
 * full cubes: slabs, stairs, fences, doors... Full cubes collide through exposedSolidVoxels.
 */
export function shapeColliderBoxes(
  chunk: ChunkData,
  sample: BlockSampler,
  sampleState?: StateSampler,
): Float32Array {
  const out: number[] = [];
  const S = CHUNK_SIZE;
  const at = (x: number, y: number, z: number): number => {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    if (x < 0 || x >= S || z < 0 || z >= S) return sample(x, y, z);
    return chunk.get(x, y, z);
  };
  const stateOf = stateReader(chunk, sampleState);
  for (let y = 0; y < CHUNK_HEIGHT; y++)
    for (let z = 0; z < S; z++)
      for (let x = 0; x < S; x++) {
        const id = chunk.get(x, y, z);
        if (!IS_SOLID[id] || FULL_SOLID[id]) continue;
        for (const { box: b } of blockShapeBoxes(stateOf, at, x, y, z, id, true))
          out.push(x + b[0], y + b[1], z + b[2], x + b[3], y + b[4], z + b[5]);
      }
  return new Float32Array(out);
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
