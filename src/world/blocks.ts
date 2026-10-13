/**
 * Block registry. Block IDs are stored as bytes in chunk arrays, so there can be at most 256.
 */

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

export const BLOCKS: readonly BlockDef[] = defs.map((d, id) => ({ ...d, id }));

const byKey = new Map(BLOCKS.map((b) => [b.key, b]));
export function blockByKey(key: string): BlockDef | undefined {
  return byKey.get(key);
}

/** Lookup tables indexed by block id, for hot loops. */
export const IS_SOLID = new Uint8Array(256);
export const IS_OPAQUE = new Uint8Array(256);
export const RENDER = new Uint8Array(256); // 0 none, 1 opaque, 2 cutout, 3 translucent, 4 custom
export const FALLS = new Uint8Array(256);
/** Water strength by id: 8 for a source block, 1-7 for flowing water, 0 for anything else. */
export const WATER_STRENGTH = new Uint8Array(256);
WATER_STRENGTH[WATER] = 8;
for (let s = 1; s <= 7; s++) WATER_STRENGTH[WATER_FLOW[s]] = s;
for (const b of BLOCKS) {
  FALLS[b.id] = b.gravity ? 1 : 0;
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
