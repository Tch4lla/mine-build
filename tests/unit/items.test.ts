import { describe, expect, it } from 'vitest';
import { Inventory } from '../../src/items/inventory';
import { RECIPES, craft } from '../../src/items/crafting';
import { applyBind, breakTime, canBind, boundStats, wearBind } from '../../src/bind/bindRecipes';
import { ITEMS, item } from '../../src/items/items';

describe('inventory', () => {
  it('stacks up to the max and spills into new slots', () => {
    const inv = new Inventory();
    expect(inv.add({ id: 'dirt', count: 100 })).toBe(0);
    expect(inv.slots[0]).toMatchObject({ id: 'dirt', count: 64 });
    expect(inv.slots[1]).toMatchObject({ id: 'dirt', count: 36 });
    expect(inv.count('dirt')).toBe(100);
  });
  it('does not stack items with different data', () => {
    const inv = new Inventory();
    inv.add({ id: 'photo_frame', count: 1, data: { photoId: 'a' } });
    inv.add({ id: 'photo_frame', count: 1, data: { photoId: 'b' } });
    expect(inv.slots[1]?.data?.photoId).toBe('b');
  });
  it('removes items only if enough are present', () => {
    const inv = new Inventory();
    inv.add({ id: 'stick', count: 3 });
    expect(inv.remove('stick', 5)).toBe(false);
    expect(inv.remove('stick', 2)).toBe(true);
    expect(inv.count('stick')).toBe(1);
  });
});

describe('crafting', () => {
  it('only references real items', () => {
    for (const r of RECIPES) {
      expect(() => item(r.output.id)).not.toThrow();
      for (const i of r.inputs) expect(() => item(i.id)).not.toThrow();
    }
  });
  it('crafts planks from logs', () => {
    const inv = new Inventory();
    inv.add({ id: 'log', count: 1 });
    const recipe = RECIPES.find((r) => r.output.id === 'planks')!;
    expect(craft(inv, recipe)).toBe(true);
    expect(inv.count('planks')).toBe(4);
    expect(inv.count('log')).toBe(0);
    expect(craft(inv, recipe)).toBe(false);
  });
});

describe('workbench', () => {
  it('turns stick + rock into a Rock Hammer that mines like a pickaxe', () => {
    const s = boundStats('stick', 'rock');
    expect(s.name).toBe('Rock Hammer');
    expect(s.cls).toBe('pickaxe');
    expect(s.damage).toBeGreaterThan(boundStats('stick').damage);
  });
  it('adds material damage generically', () => {
    expect(boundStats('wood_sword', 'flint').damage).toBe(4 + 6);
    expect(boundStats('wood_sword', 'flint').name).toBe('Flint Wooden Sword');
  });
  it('gives effects from materials', () => {
    expect(boundStats('wood_sword', 'ember').effect).toBe('fire');
    expect(boundStats('shield', 'part_rocket')).toMatchObject({ name: 'Rocket Shield', effect: 'rocket' });
  });
  it('rejects non-fusable combos', () => {
    expect(canBind('stick', 'dirt')).toBe(false);
    expect(canBind('rock', 'flint')).toBe(false);
    expect(canBind('shield', 'part_rocket')).toBe(true);
  });
  it('every fusable item has material stats', () => {
    for (const d of ITEMS.filter((i) => i.fusable)) expect(canBind('stick', d.id)).toBe(true);
  });
  it('wears down and breaks off, leaving the base tool', () => {
    let stack = applyBind({ id: 'stick', count: 1 }, 'part_rocket');
    expect(stack.data?.durability).toBe(3);
    let broke = false;
    for (let i = 0; i < 3; i++) ({ stack, broke } = wearBind(stack));
    expect(broke).toBe(true);
    expect(stack.data).toBeUndefined();
    expect(stack.id).toBe('stick');
  });
  it('mines stone faster with the right tool', () => {
    const hand = breakTime(3, 'pickaxe', null);
    const pick = breakTime(3, 'pickaxe', boundStats('wood_pickaxe'));
    const hammer = breakTime(3, 'pickaxe', boundStats('stick', 'rock'));
    expect(pick).toBeLessThan(hand);
    expect(hammer).toBeLessThan(pick);
  });
});
