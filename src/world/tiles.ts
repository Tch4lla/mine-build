/**
 * Atlas tile layout, shared by the (DOM-based) atlas painter and the (pure) chunk mesher.
 *
 * The first row holds the procedurally painted core tiles (TILE_NAMES). The sprite-library tiles
 * (public/library/blocks.png) follow from the second row on; they are named `lib:<index>`.
 */
import { LIB_ATLAS_COLS, LIB_ATLAS_ROWS } from '../generated/library';

export const TILE_NAMES = [
  'grass_top',
  'grass_side',
  'dirt',
  'stone',
  'sand',
  'water',
  'log_top',
  'log_side',
  'leaves',
  'planks',
  'glass',
  'cobblestone',
  'coal_ore',
  'iron_ore',
  'brick',
  'snow',
  'snow_side',
  'crystal_ore',
  'gravel',
  'bedrock',
  'wool',
  'lamp',
] as const;

export type TileName = (typeof TILE_NAMES)[number];

export const TILE_PX = 32;
export const ATLAS_COLS = LIB_ATLAS_COLS;
/** Rows of core tiles before the library tiles start. */
export const CORE_ROWS = Math.ceil(TILE_NAMES.length / ATLAS_COLS);
export const ATLAS_ROWS = CORE_ROWS + LIB_ATLAS_ROWS;

/** Tile name of a sprite-library atlas tile. */
export function libTile(i: number): string {
  return `lib:${i}`;
}

const index = new Map<string, number>(TILE_NAMES.map((n, i) => [n, i]));
export function tileIndex(name: string): number {
  const i = index.get(name);
  if (i !== undefined) return i;
  if (name.startsWith('lib:')) {
    const n = Number(name.slice(4));
    if (Number.isInteger(n) && n >= 0 && n < LIB_ATLAS_COLS * LIB_ATLAS_ROWS)
      return CORE_ROWS * ATLAS_COLS + n;
  }
  throw new Error(`Unknown tile ${name}`);
}

/** UV rectangle [u0, v0, u1, v1] for a tile (v up, Three.js convention, flipY texture). */
export function tileUV(i: number): [number, number, number, number] {
  const col = i % ATLAS_COLS;
  const row = Math.floor(i / ATLAS_COLS);
  // Inset by a fraction of a texel to avoid bleeding between tiles.
  const eps = 0.02 / TILE_PX;
  const u0 = col / ATLAS_COLS + eps;
  const u1 = (col + 1) / ATLAS_COLS - eps;
  const v1 = 1 - row / ATLAS_ROWS - eps;
  const v0 = 1 - (row + 1) / ATLAS_ROWS + eps;
  return [u0, v0, u1, v1];
}
