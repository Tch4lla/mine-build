/** Item registry (pure data; icons are painted separately in icons.ts). */
import { BLOCKS, type ToolClass } from '../world/blocks';

export type ItemKind = 'block' | 'tool' | 'material' | 'part' | 'photo_frame' | 'photo_block' | 'placeable';

export type WeaponClass = ToolClass | 'sword' | 'shield' | 'stick';

export interface ToolStats {
  cls: WeaponClass;
  damage: number;
  /** Break-speed multiplier applied when the block's preferred tool matches `cls`. */
  breakSpeed: number;
  knockback: number;
  durability: number;
  /** Pixel coords (16x16 icon grid) where bound materials attach. */
  fuseAnchor: [number, number];
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  maxStack: number;
  /** Block placed by this item. */
  block?: number;
  tool?: ToolStats;
  /** Part spawned by this item (Tether). */
  part?: string;
  /** Can be bound onto tools. */
  fusable?: boolean;
  /** Primary colour (for icons, particles and bound models). */
  color: string;
  description?: string;
}

const items: ItemDef[] = [];
const add = (d: ItemDef) => items.push(d);

// Blocks (all except air, water and special blocks).
for (const b of BLOCKS) {
  if (b.render === 'none' || b.render === 'custom' || b.key.startsWith('water') || b.key === 'bedrock')
    continue;
  add({ id: b.key, name: b.name, kind: 'block', maxStack: 64, block: b.id, color: '#888' });
}

// Tools.
add({
  id: 'stick',
  name: 'Stick',
  kind: 'tool',
  maxStack: 16,
  color: '#8b5a2b',
  tool: { cls: 'stick', damage: 2, breakSpeed: 1, knockback: 1, durability: 30, fuseAnchor: [12, 3] },
  description: 'A humble stick. Bind something to it!',
});
add({
  id: 'wood_sword',
  name: 'Wooden Sword',
  kind: 'tool',
  maxStack: 1,
  color: '#b08654',
  tool: { cls: 'sword', damage: 4, breakSpeed: 1, knockback: 1.2, durability: 60, fuseAnchor: [12, 3] },
});
add({
  id: 'wood_pickaxe',
  name: 'Wooden Pickaxe',
  kind: 'tool',
  maxStack: 1,
  color: '#b08654',
  tool: { cls: 'pickaxe', damage: 2, breakSpeed: 3, knockback: 1, durability: 80, fuseAnchor: [9, 4] },
});
add({
  id: 'wood_axe',
  name: 'Wooden Axe',
  kind: 'tool',
  maxStack: 1,
  color: '#b08654',
  tool: { cls: 'axe', damage: 3, breakSpeed: 3, knockback: 1, durability: 80, fuseAnchor: [10, 4] },
});
add({
  id: 'wood_shovel',
  name: 'Wooden Shovel',
  kind: 'tool',
  maxStack: 1,
  color: '#b08654',
  tool: { cls: 'shovel', damage: 2, breakSpeed: 3, knockback: 1, durability: 80, fuseAnchor: [12, 3] },
});
add({
  id: 'shield',
  name: 'Wooden Shield',
  kind: 'tool',
  maxStack: 1,
  color: '#9a6b3c',
  tool: { cls: 'shield', damage: 1, breakSpeed: 1, knockback: 2, durability: 100, fuseAnchor: [8, 8] },
  description: 'Hold right-click to guard. Bind a rocket for a shield jump!',
});

// Bind materials.
add({ id: 'rock', name: 'Rock', kind: 'material', maxStack: 64, fusable: true, color: '#8a8a8a' });
add({ id: 'flint', name: 'Flint', kind: 'material', maxStack: 64, fusable: true, color: '#3b3b44' });
add({
  id: 'iron_chunk',
  name: 'Iron Chunk',
  kind: 'material',
  maxStack: 64,
  fusable: true,
  color: '#d8d0c8',
});
add({ id: 'crystal', name: 'Crystal', kind: 'material', maxStack: 64, fusable: true, color: '#6ee6ff' });
add({ id: 'ember', name: 'Ember', kind: 'material', maxStack: 64, fusable: true, color: '#ff7a2a' });
add({ id: 'slime', name: 'Puff Gel', kind: 'material', maxStack: 64, fusable: true, color: '#c3a8f0' });
add({
  id: 'blast_fruit',
  name: 'Blast Fruit',
  kind: 'material',
  maxStack: 16,
  fusable: true,
  color: '#e8423a',
});

// Tether parts (some can also be bound onto tools).
const part = (id: string, name: string, color: string, fusable = false, description?: string) =>
  add({ id: `part_${id}`, name, kind: 'part', maxStack: 16, part: id, color, fusable, description });
part('board', 'Wooden Board', '#b08654');
part('crate', 'Crate', '#a0703c');
part('wheel', 'Wheel', '#333333');
part('fan', 'Fan', '#5aa0d8', true, 'Pushes air. Hit it or ride a seat to switch it on.');
part('rocket', 'Rocket', '#d84a3a', true, 'A short, powerful burst of thrust.');
part('balloon', 'Balloon', '#ff6fa8', false, 'Floats upward.');
part('seat', 'Seat', '#3a6ad8', false, 'Sit to steer: WASD drives wheels, Space toggles devices.');
part('spring', 'Spring', '#c0c0c0', true, 'Launches whatever sits on it.');
part('light', 'Light', '#ffe680', false, 'A glowing orb.');

// Placeables.
add({ id: 'dummy', name: 'Training Dummy', kind: 'placeable', maxStack: 8, color: '#c8a060' });

// Photo items (carry a photoId in their stack data).
add({ id: 'photo_frame', name: 'Picture Frame', kind: 'photo_frame', maxStack: 16, color: '#7a5230' });
add({ id: 'photo_block', name: 'Photo Block', kind: 'photo_block', maxStack: 64, color: '#7a5230' });

export const ITEMS: readonly ItemDef[] = items;
const byId = new Map(items.map((i) => [i.id, i]));

export function item(id: string): ItemDef {
  const d = byId.get(id);
  if (!d) throw new Error(`Unknown item ${id}`);
  return d;
}

export function hasItem(id: string): boolean {
  return byId.has(id);
}
