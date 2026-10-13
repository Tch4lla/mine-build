/** Shapeless crafting recipes (a recipe book: pick a recipe, ingredients are consumed). */
import type { Inventory, ItemStack } from './inventory';

export interface Recipe {
  id: string;
  output: ItemStack;
  inputs: { id: string; count: number }[];
  category: 'basics' | 'tools' | 'parts' | 'blocks';
}

const r = (category: Recipe['category'], out: string, count: number, inputs: [string, number][]): Recipe => ({
  id: `${out}_${inputs.map(([i]) => i).join('_')}`,
  output: { id: out, count },
  inputs: inputs.map(([id, c]) => ({ id, count: c })),
  category,
});

export const RECIPES: Recipe[] = [
  r('basics', 'planks', 4, [['log', 1]]),
  r('basics', 'stick', 4, [['planks', 2]]),
  r('tools', 'wood_sword', 1, [
    ['planks', 2],
    ['stick', 1],
  ]),
  r('tools', 'wood_pickaxe', 1, [
    ['planks', 3],
    ['stick', 2],
  ]),
  r('tools', 'wood_axe', 1, [
    ['planks', 3],
    ['stick', 2],
  ]),
  r('tools', 'wood_shovel', 1, [
    ['planks', 1],
    ['stick', 2],
  ]),
  r('tools', 'shield', 1, [['planks', 6]]),
  r('parts', 'part_board', 2, [['planks', 3]]),
  r('parts', 'part_crate', 1, [['planks', 4]]),
  r('parts', 'part_wheel', 2, [
    ['planks', 2],
    ['stick', 2],
  ]),
  r('parts', 'part_seat', 1, [
    ['planks', 3],
    ['stick', 2],
  ]),
  r('parts', 'part_fan', 1, [
    ['planks', 2],
    ['iron_chunk', 1],
  ]),
  r('parts', 'part_rocket', 1, [
    ['ember', 2],
    ['iron_chunk', 1],
  ]),
  r('parts', 'part_balloon', 1, [
    ['slime', 2],
    ['wool', 1],
  ]),
  r('parts', 'part_spring', 1, [
    ['iron_chunk', 1],
    ['slime', 1],
  ]),
  r('parts', 'part_light', 1, [
    ['crystal', 1],
    ['glass', 1],
  ]),
  r('parts', 'dummy', 1, [
    ['stick', 2],
    ['planks', 2],
  ]),
  r('blocks', 'glass', 2, [
    ['sand', 2],
    ['ember', 1],
  ]),
  r('blocks', 'brick', 4, [['cobblestone', 4]]),
  r('blocks', 'wool', 1, [['leaves', 4]]),
  r('blocks', 'lamp', 1, [
    ['crystal', 1],
    ['planks', 1],
  ]),
];

export function canCraft(inv: Inventory, recipe: Recipe): boolean {
  return recipe.inputs.every((i) => inv.count(i.id) >= i.count);
}

/** Crafts once. Returns false if ingredients are missing. */
export function craft(inv: Inventory, recipe: Recipe): boolean {
  if (!canCraft(inv, recipe)) return false;
  for (const i of recipe.inputs) inv.remove(i.id, i.count);
  const left = inv.add({ ...recipe.output });
  if (left > 0) {
    // Inventory full: refund ingredients rather than losing the output.
    for (const i of recipe.inputs) inv.add({ id: i.id, count: i.count });
    inv.remove(recipe.output.id, recipe.output.count - left);
    return false;
  }
  return true;
}
