/**
 * Block registry. Block ids are stored in the low 12 bits of each chunk cell (see chunk.ts), so
 * there can be up to 4,096 block types.
 */
import { MAX_BLOCK_ID } from './chunk';
import { LIB_BLOCKS } from '../generated/library';
import type { LibBlock } from '../library/types';
import { libTile } from './tiles';
import type { Box, BlockShape } from './shapes';

export type ToolClass = 'pickaxe' | 'axe' | 'shovel' | 'none';

/** How a block is drawn and whether it hides its neighbours' faces. */
export type RenderType =
  | 'none' // air
  | 'opaque' // full cube, hides neighbouring faces
  | 'cutout' // drawn with alpha test (leaves, glass); does not hide neighbours
  | 'translucent' // drawn in the transparent pass (water)
  | 'custom'; // not drawn by the chunk mesher (photo blocks); rendered by another system

export interface BlockDrop {
  item: string;
  count?: number;
  /** 0..1, defaults to 1 */
  chance?: number;
}

export interface BlockDef {
  id: number;
  key: string;
  name: string;
  /** Atlas tile names for top, side and bottom faces. */
  tiles: { top: string; side: string; bottom: string };
  render: RenderType;
  /** Whether entities collide with it. */
  solid: boolean;
  /** Seconds to break with bare hands. Infinity = unbreakable. */
  hardness: number;
  tool: ToolClass;
  burnable?: boolean;
  /** Falls when the block below is removed (sand, gravel). */
  gravity?: boolean;
  /** Items dropped when broken. Defaults to the block's own item. */
  drops?: BlockDrop[];
  /** Geometry (see shapes.ts). Defaults to a full cube. */
  shape?: BlockShape;
  /** The library drawing's main box, for 'box' shapes. */
  box?: Box | null;
  /** Light level 0–15; bright blocks are drawn unshaded. */
  light?: number;
  /** Catalogue group (the library's category; core blocks are 'Basics'). */
  category?: string;
  /** Sprite-library block this was made from. */
  lib?: LibBlock;
  /** Storage blocks: how many item slots they hold. */
  storage?: number;
  /** Doors: the block whose side tile covers their edges, top and bottom (their material). */
  edgeOf?: number;
  /** Doors: the picture of the panel's upper and lower halves. */
  doorTiles?: { upper: string; lower: string };
  /** Core blocks: their library look (see setBlockArt) and its library id. */
  libTiles?: { top: string; side: string; bottom: string };
  libLookId?: string;
}

export const AIR = 0;

const defs: Omit<BlockDef, 'id'>[] = [];
function def(d: Omit<BlockDef, 'id'>): number {
  defs.push(d);
  return defs.length - 1;
}
const all = (t: string) => ({ top: t, side: t, bottom: t });

def({
  key: 'air',
  name: 'Air',
  tiles: all('stone'),
  render: 'none',
  solid: false,
  hardness: 0,
  tool: 'none',
});
export const GRASS = def({
  key: 'grass',
  name: 'Grass',
  tiles: { top: 'grass_top', side: 'grass_side', bottom: 'dirt' },
  render: 'opaque',
  solid: true,
  hardness: 0.6,
  tool: 'shovel',
  drops: [{ item: 'dirt' }],
});
export const DIRT = def({
  key: 'dirt',
  name: 'Dirt',
  tiles: all('dirt'),
  render: 'opaque',
  solid: true,
  hardness: 0.5,
  tool: 'shovel',
});
export const STONE = def({
  key: 'stone',
  name: 'Stone',
  tiles: all('stone'),
  render: 'opaque',
  solid: true,
  hardness: 3,
  tool: 'pickaxe',
  drops: [{ item: 'cobblestone' }, { item: 'rock', chance: 0.35 }],
});
export const SAND = def({
  key: 'sand',
  name: 'Sand',
  tiles: all('sand'),
  render: 'opaque',
  solid: true,
  hardness: 0.5,
  tool: 'shovel',
  gravity: true,
});
export const WATER = def({
  key: 'water',
  name: 'Water',
  tiles: all('water'),
  render: 'translucent',
  solid: false,
  hardness: Infinity,
  tool: 'none',
  drops: [],
});
export const LOG = def({
  key: 'log',
  name: 'Log',
  tiles: { top: 'log_top', side: 'log_side', bottom: 'log_top' },
  render: 'opaque',
  solid: true,
  hardness: 2,
  tool: 'axe',
  burnable: true,
});
export const LEAVES = def({
  key: 'leaves',
  name: 'Leaves',
  tiles: all('leaves'),
  render: 'cutout',
  solid: true,
  hardness: 0.3,
  tool: 'none',
  burnable: true,
  drops: [
    { item: 'leaves', chance: 0.5 },
    { item: 'blast_fruit', chance: 0.06 },
    { item: 'stick', chance: 0.15 },
  ],
});
export const PLANKS = def({
  key: 'planks',
  name: 'Planks',
  tiles: all('planks'),
  render: 'opaque',
  solid: true,
  hardness: 1.5,
  tool: 'axe',
  burnable: true,
});
export const GLASS = def({
  key: 'glass',
  name: 'Glass',
  tiles: all('glass'),
  render: 'cutout',
  solid: true,
  hardness: 0.4,
  tool: 'none',
});
export const COBBLESTONE = def({
  key: 'cobblestone',
  name: 'Cobblestone',
  tiles: all('cobblestone'),
  render: 'opaque',
  solid: true,
  hardness: 3,
  tool: 'pickaxe',
});
export const COAL_ORE = def({
  key: 'coal_ore',
  name: 'Ember Ore',
  tiles: all('coal_ore'),
  render: 'opaque',
  solid: true,
  hardness: 3.5,
  tool: 'pickaxe',
  drops: [{ item: 'ember', count: 2 }],
});
export const IRON_ORE = def({
  key: 'iron_ore',
  name: 'Iron Ore',
  tiles: all('iron_ore'),
  render: 'opaque',
  solid: true,
  hardness: 4,
  tool: 'pickaxe',
  drops: [{ item: 'iron_chunk' }],
});
export const BRICK = def({
  key: 'brick',
  name: 'Bricks',
  tiles: all('brick'),
  render: 'opaque',
  solid: true,
  hardness: 3,
  tool: 'pickaxe',
});
export const SNOW = def({
  key: 'snow',
  name: 'Snow',
  tiles: { top: 'snow', side: 'snow_side', bottom: 'dirt' },
  render: 'opaque',
  solid: true,
  hardness: 0.5,
  tool: 'shovel',
});
export const CRYSTAL_ORE = def({
  key: 'crystal_ore',
  name: 'Crystal Ore',
  tiles: all('crystal_ore'),
  render: 'opaque',
  solid: true,
  hardness: 4,
  tool: 'pickaxe',
  drops: [{ item: 'crystal' }],
});
export const GRAVEL = def({
  key: 'gravel',
  name: 'Gravel',
  tiles: all('gravel'),
  gravity: true,
  render: 'opaque',
  solid: true,
  hardness: 0.6,
  tool: 'shovel',
  drops: [{ item: 'gravel' }, { item: 'flint', chance: 0.4 }],
});
export const BEDROCK = def({
  key: 'bedrock',
  name: 'Bedrock',
  tiles: all('bedrock'),
  render: 'opaque',
  solid: true,
  hardness: Infinity,
  tool: 'none',
  drops: [],
});
export const WOOL = def({
  key: 'wool',
  name: 'White Wool',
  tiles: all('wool'),
  render: 'opaque',
  solid: true,
  hardness: 0.8,
  tool: 'none',
  burnable: true,
});
export const LAMP = def({
  key: 'lamp',
  name: 'Crystal Lamp',
  tiles: all('lamp'),
  render: 'opaque',
  solid: true,
  hardness: 0.5,
  tool: 'none',
  light: 15,
});
export const PHOTO = def({
  key: 'photo_block',
  name: 'Photo Block',
  tiles: all('planks'),
  render: 'custom',
  solid: true,
  hardness: 0.5,
  tool: 'none',
  drops: [],
});

/**
 * Flowing water, strength 1 (thin trickle) to 7 (right next to a source). New ids are appended
 * after every existing block so saved chunks keep their meaning.
 */
export const WATER_FLOW: number[] = [];
for (let s = 1; s <= 7; s++) {
  WATER_FLOW[s] = def({
    key: `water_flow_${s}`,
    name: 'Water',
    tiles: all('water'),
    render: 'translucent',
    solid: false,
    hardness: Infinity,
    tool: 'none',
    drops: [],
  });
}

// ---------------------------------------------------------------------------------------------
// Sprite-library blocks (src/generated/library.ts). Their ids come from the append-only
// src/generated/blockIds.json; library blocks that are the library look of a core block (core set)
// don't get their own id and only lend that block their tiles.

const HARDNESS: Record<string, number> = {
  Instant: 0.05,
  Soft: 0.6,
  Firm: 1.5,
  Hard: 3,
  'Very hard': 6,
  Unbreakable: Infinity,
};
const TOOLS: Record<string, ToolClass> = { Pickaxe: 'pickaxe', Axe: 'axe', Shovel: 'shovel' };

function libTiles(b: LibBlock) {
  const t = b.tiles;
  return 'sprite' in t
    ? all(libTile(t.sprite))
    : { top: libTile(t.top), side: libTile(t.side), bottom: libTile(t.bottom) };
}

/** The game shape for a library block. */
function libShape(b: LibBlock): BlockShape {
  const sprite = 'sprite' in b.tiles;
  switch (b.shape) {
    case 'cube':
      return sprite ? 'cross' : 'cube';
    case 'slab':
    case 'stairs':
    case 'wall':
    case 'fence':
    case 'fence_gate':
    case 'pane':
    case 'door':
    case 'trapdoor':
      return b.shape;
    case 'bars':
      return 'pane';
    case 'bed':
      return 'bed';
    case 'sign':
    case 'hanging_sign':
    case 'banner':
      return sprite ? 'flat' : 'box';
    default:
      // Beds, shelves, carpets, plates, buttons and single-box objects keep their drawing's box;
      // everything else drawn as a picture (plants, torches, signs...) is shown as crossed quads.
      return !sprite && b.box ? 'box' : 'cross';
  }
}

/** Light for library blocks the sheet lists at 0 that should glow: campfires and candles. */
const LIGHT_OVERRIDE = (key: string): number => (key === 'campfire' ? 15 : /candle$/.test(key) ? 6 : 0);

/** Shapes the player walks through. */
const WALK_THROUGH = new Set([
  'plant',
  'pressure_plate',
  'button',
  'carpet',
  'banner',
  'sign',
  'hanging_sign',
]);

for (const b of [...LIB_BLOCKS].sort((a, c) => a.blockId - c.blockId)) {
  if (b.core) {
    const core = defs.find((d) => d.key === b.core)!;
    core.libTiles = libTiles(b);
    core.libLookId = b.id;
    continue;
  }
  if (b.blockId !== defs.length) throw new Error(`Library block ${b.key} expected id ${defs.length}`);
  const shape = libShape(b);
  const cube = shape === 'cube';
  def({
    key: b.key,
    name: b.name,
    tiles: libTiles(b),
    render: cube && !b.seeThrough ? 'opaque' : 'cutout',
    solid: shape !== 'cross' && !WALK_THROUGH.has(b.shape),
    hardness: HARDNESS[b.hardness] ?? 1.5,
    tool: TOOLS[b.bestTool] ?? 'none',
    burnable: b.flammable,
    gravity: b.falls,
    shape,
    box: b.box,
    light: b.light || LIGHT_OVERRIDE(b.key),
    storage: b.key === 'chest' || b.key === 'barrel' ? 27 : b.shape === 'shelf' ? 9 : undefined,
    category: b.category,
    lib: b,
    doorTiles:
      'upper' in b.tiles && b.tiles.upper !== undefined && b.tiles.lower !== undefined
        ? { upper: libTile(b.tiles.upper), lower: libTile(b.tiles.lower) }
        : undefined,
  });
}

/**
 * A door's material, for its edges: its wood's planks, its copper stage, or iron. The picture of
 * the door only covers its two broad faces.
 */
function doorEdgeBlock(key: string): number {
  const base = key.replace(/_door$/, '');
  for (const libId of [`${base}_planks`, base === 'copper' ? 'copper_block' : base, `${base}_block`]) {
    // Library ids that are the look of a core block (oak planks) live under the core key.
    const k = LIB_BLOCKS.find((b) => b.id === libId)?.key ?? libId;
    const i = defs.findIndex((d) => d.key === k);
    if (i >= 0) return i;
  }
  return PLANKS;
}
for (const d of defs) if (d.shape === 'door') d.edgeOf = doorEdgeBlock(d.key);

export const BLOCKS: readonly BlockDef[] = defs.map((d, id) => ({ ...d, id }));

/** Core blocks keep their own look ('world') or take their sprite-library look ('library'). */
export type ArtStyle = 'world' | 'library';
const worldTiles = BLOCKS.map((b) => b.tiles);
let art: ArtStyle = 'world';
export function setBlockArt(style: ArtStyle): void {
  art = style;
  for (const b of BLOCKS) if (b.libTiles) b.tiles = style === 'library' ? b.libTiles : worldTiles[b.id];
}
export function blockArt(): ArtStyle {
  return art;
}

/** The sprite-library drawing a block's icon uses: its own, or its library look under 'library' art. */
export function blockLibId(b: BlockDef): string | undefined {
  return b.lib?.id ?? (art === 'library' ? b.libLookId : undefined);
}

const byKey = new Map(BLOCKS.map((b) => [b.key, b]));
export function blockByKey(key: string): BlockDef | undefined {
  return byKey.get(key);
}

/** Lookup tables indexed by block id, for hot loops. */
export const IS_SOLID = new Uint8Array(MAX_BLOCK_ID + 1);
export const IS_OPAQUE = new Uint8Array(MAX_BLOCK_ID + 1);
export const RENDER = new Uint8Array(MAX_BLOCK_ID + 1); // 0 none, 1 opaque, 2 cutout, 3 translucent, 4 custom
export const FALLS = new Uint8Array(MAX_BLOCK_ID + 1);
/** Full, solid cubes (voxel colliders); other solid blocks collide by their shape's boxes. */
export const FULL_SOLID = new Uint8Array(MAX_BLOCK_ID + 1);
/** Light level 0–15 by id. */
export const LIGHT = new Uint8Array(MAX_BLOCK_ID + 1);
/** Water strength by id: 8 for a source block, 1-7 for flowing water, 0 for anything else. */
export const WATER_STRENGTH = new Uint8Array(MAX_BLOCK_ID + 1);
WATER_STRENGTH[WATER] = 8;
for (let s = 1; s <= 7; s++) WATER_STRENGTH[WATER_FLOW[s]] = s;
for (const b of BLOCKS) {
  FALLS[b.id] = b.gravity ? 1 : 0;
  FULL_SOLID[b.id] = b.solid && (b.shape ?? 'cube') === 'cube' ? 1 : 0;
  LIGHT[b.id] = b.light ?? 0;
  IS_SOLID[b.id] = b.solid ? 1 : 0;
  IS_OPAQUE[b.id] = b.render === 'opaque' ? 1 : 0;
  RENDER[b.id] = ['none', 'opaque', 'cutout', 'translucent', 'custom'].indexOf(b.render);
}

export function isWater(id: number): boolean {
  return WATER_STRENGTH[id] > 0;
}

/** Block id for water of a given strength (8 = source). */
export function waterOfStrength(strength: number): number {
  return strength >= 8 ? WATER : strength <= 0 ? AIR : WATER_FLOW[strength];
}
