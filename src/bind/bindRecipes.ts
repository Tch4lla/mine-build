/** Bind: attach a material to a tool. Pure stat math so it can be unit tested. */
import { item, type WeaponClass } from '../items/items';
import type { ItemStack } from '../items/inventory';

export type BindEffect = 'none' | 'fire' | 'bounce' | 'blast' | 'wind' | 'light' | 'rocket' | 'spring';

export interface MaterialStats {
  damage: number;
  breakMult: number;
  knockbackMult: number;
  durability: number;
  effect: BindEffect;
}

export const MATERIALS: Record<string, MaterialStats> = {
  rock: { damage: 4, breakMult: 1.5, knockbackMult: 1.3, durability: 25, effect: 'none' },
  flint: { damage: 6, breakMult: 1.2, knockbackMult: 1, durability: 15, effect: 'none' },
  iron_chunk: { damage: 5, breakMult: 2, knockbackMult: 1.2, durability: 45, effect: 'none' },
  crystal: { damage: 3, breakMult: 1.3, knockbackMult: 1, durability: 30, effect: 'light' },
  ember: { damage: 2, breakMult: 1, knockbackMult: 1, durability: 12, effect: 'fire' },
  slime: { damage: 0, breakMult: 1, knockbackMult: 3, durability: 20, effect: 'bounce' },
  blast_fruit: { damage: 10, breakMult: 1, knockbackMult: 2, durability: 1, effect: 'blast' },
  part_fan: { damage: 1, breakMult: 1, knockbackMult: 1.5, durability: 25, effect: 'wind' },
  part_rocket: { damage: 2, breakMult: 1, knockbackMult: 1, durability: 3, effect: 'rocket' },
  part_spring: { damage: 1, breakMult: 1, knockbackMult: 2.5, durability: 10, effect: 'spring' },
};

/** Special combinations that change more than the numbers. */
interface Override {
  name: string;
  cls?: WeaponClass;
  damage?: number;
  breakSpeed?: number;
}
const OVERRIDES: Record<string, Override> = {
  'stick+rock': { name: 'Rock Hammer', cls: 'pickaxe', damage: 6, breakSpeed: 4 },
  'stick+flint': { name: 'Flint Spear', damage: 7 },
  'stick+iron_chunk': { name: 'Iron Mace', cls: 'pickaxe', damage: 8, breakSpeed: 3 },
  'stick+blast_fruit': { name: 'Blast Stick' },
  'shield+part_rocket': { name: 'Rocket Shield' },
  'shield+part_spring': { name: 'Spring Shield' },
  'shield+slime': { name: 'Bouncy Shield' },
  'wood_sword+ember': { name: 'Flame Blade' },
  'wood_sword+crystal': { name: 'Glow Blade' },
  'wood_pickaxe+iron_chunk': { name: 'Iron-Tipped Pickaxe' },
};

export interface BoundStats {
  name: string;
  cls: WeaponClass;
  damage: number;
  breakSpeed: number;
  knockback: number;
  /** Durability of the bound material (Infinity for unbound tools). */
  durability: number;
  effect: BindEffect;
}

export function canBind(toolId: string, materialId: string): boolean {
  const t = item(toolId);
  return t.kind === 'tool' && materialId in MATERIALS && item(materialId).fusable === true;
}

export function boundStats(toolId: string, materialId?: string): BoundStats {
  const t = item(toolId);
  if (!t.tool) throw new Error(`${toolId} is not a tool`);
  const base = t.tool;
  if (!materialId) {
    return {
      name: t.name,
      cls: base.cls,
      damage: base.damage,
      breakSpeed: base.breakSpeed,
      knockback: base.knockback,
      durability: Infinity,
      effect: 'none',
    };
  }
  const m = MATERIALS[materialId];
  if (!m) throw new Error(`${materialId} cannot be bound`);
  const o = OVERRIDES[`${toolId}+${materialId}`];
  return {
    name: o?.name ?? `${item(materialId).name} ${t.name}`,
    cls: o?.cls ?? base.cls,
    damage: o?.damage ?? base.damage + m.damage,
    breakSpeed: o?.breakSpeed ?? Math.round(base.breakSpeed * m.breakMult * 100) / 100,
    knockback: Math.round(base.knockback * m.knockbackMult * 100) / 100,
    durability: m.durability,
    effect: m.effect,
  };
}

export function stackStats(stack: ItemStack | null): BoundStats | null {
  if (!stack || item(stack.id).kind !== 'tool') return null;
  return boundStats(stack.id, stack.data?.fuse);
}

/** Returns a new stack with the material bound on (replacing any previous one). */
export function applyBind(tool: ItemStack, materialId: string): ItemStack {
  if (!canBind(tool.id, materialId)) throw new Error(`Cannot fuse ${materialId} onto ${tool.id}`);
  const stats = boundStats(tool.id, materialId);
  return { id: tool.id, count: 1, data: { ...tool.data, fuse: materialId, durability: stats.durability } };
}

/**
 * Wears down the fused material. Returns the new stack and whether the material broke off.
 * Unfused tools do not wear.
 */
export function wearBind(tool: ItemStack, amount = 1): { stack: ItemStack; broke: boolean } {
  if (!tool.data?.fuse) return { stack: tool, broke: false };
  const d = (tool.data.durability ?? 1) - amount;
  if (d <= 0) {
    const data = { ...tool.data };
    delete data.fuse;
    delete data.durability;
    return { stack: { ...tool, data: Object.keys(data).length ? data : undefined }, broke: true };
  }
  return { stack: { ...tool, data: { ...tool.data, durability: d } }, broke: false };
}

/** Break-time in seconds for a block of the given hardness and preferred tool. */
export function breakTime(hardness: number, blockTool: string, stats: BoundStats | null): number {
  if (!Number.isFinite(hardness)) return Infinity;
  let speed = 1;
  if (stats && blockTool !== 'none' && stats.cls === blockTool) speed = stats.breakSpeed;
  // Stone-type blocks are slow without a pickaxe.
  if (blockTool === 'pickaxe' && (!stats || stats.cls !== 'pickaxe')) speed *= 0.3;
  return Math.max(0.05, hardness / speed);
}
