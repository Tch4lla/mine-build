/**
 * Shapes of the sprite-library data in src/generated/library.ts (exported from
 * documents/sozo-sprite-library.xlsx by tools/sprite-library/export_game.py).
 */

export type LibHardness = 'Instant' | 'Soft' | 'Firm' | 'Hard' | 'Very hard' | 'Unbreakable' | 'Unknown';

/**
 * Atlas tile indices in public/library/blocks.png: three faces, or one whole-sprite tile (doors
 * also have their panel cropped into an upper and a lower tile).
 */
export type LibTiles =
  | { top: number; side: number; bottom: number }
  | { sprite: number; upper?: number; lower?: number };

export interface LibBlock {
  name: string;
  id: string;
  category: string;
  /** cube, slab, stairs, plant, custom, wall, carpet, pane, door... */
  shape: string;
  family: string | null;
  variant: string | null;
  hardness: LibHardness | string;
  bestTool: string;
  light: number;
  falls: boolean;
  flammable: boolean;
  seeThrough: boolean;
  stack: number;
  ref: string;
  tiles: LibTiles;
  /** The drawing's main box in block space, [x0, y0, z0, x1, y1, z1], when it is drawn as boxes. */
  box: [number, number, number, number, number, number] | null;
  /** The hand-written game block this is the library look of, if any. */
  core: string | null;
  /** The game's block key: `core` if set, else `id` (made unique against core keys). */
  key: string;
  /** Stable numeric block id (src/generated/blockIds.json). */
  blockId: number;
}

export interface LibMaterial {
  name: string;
  id: string;
  category: string;
  stack: number;
  burnsAsFuel: boolean;
  bindCandidate: boolean;
  ref: string;
}

export interface LibGear {
  name: string;
  id: string;
  category: string;
  tier: string | null;
  damage: number | null;
  durability: number | null;
  miningSpeed: number | null;
  defence: number | null;
  bindSlot: boolean;
  stack: number;
  ref: string;
}

export interface LibFood {
  name: string;
  id: string;
  category: string;
  energyRestored: number;
  mealSize: string;
  cooksInto: string | null;
  effect: string | null;
  stack: number;
  ref: string;
}

export interface LibPotion {
  name: string;
  id: string;
  effect: string;
  form: string;
  duration: string | null;
  brewingIngredient: string;
  stack: number;
  ref: string;
}

export interface LibEffect {
  name: string;
  id: string;
  type: string;
  whatItDoes: string;
  sources: string | null;
  colour: string;
  ref: string;
}

export interface LibParticle {
  name: string;
  id: string;
  category: string;
  whenItAppears: string;
  ref: string;
}

export interface LibCreature {
  name: string;
  id: string;
  category: string;
  behaviour: string | null;
  health: number | null;
  habitat: string | null;
  drops: string | null;
  special: string | null;
  ref: string;
  /** 3D-rendered sprite under public/. */
  sprite: string;
}

export interface LibStructure {
  name: string;
  id: string;
  biome: string;
  size: string;
  contains: string;
  ref: string;
  sprite: string;
}
