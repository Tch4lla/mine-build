import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BLOCKS } from '../../src/world/blocks';
import blockIds from '../../src/generated/blockIds.json';
import {
  LIB_ATLAS_COLS,
  LIB_ATLAS_ROWS,
  LIB_BLOCKS,
  LIB_CREATURES,
  LIB_EFFECTS,
  LIB_FOOD,
  LIB_GEAR,
  LIB_MATERIALS,
  LIB_PARTICLES,
  LIB_POTIONS,
  LIB_STRUCTURES,
} from '../../src/generated/library';
import { LIBRARY_ART } from '../../src/generated/libraryArt';

/** Minimal XML well-formedness check: every opened tag is closed in order. */
function balanced(svg: string): boolean {
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    const [, close, name, selfClose] = m;
    if (selfClose) continue;
    if (close) {
      if (stack.pop() !== name) return false;
    } else stack.push(name);
  }
  return stack.length === 0;
}

const ITEM_SHEETS = [...LIB_MATERIALS, ...LIB_GEAR, ...LIB_FOOD, ...LIB_POTIONS];
const ids: Record<string, number> = blockIds;

describe('sprite library export', () => {
  it('covers all 1,204 library sprites', () => {
    const total =
      LIB_BLOCKS.length +
      ITEM_SHEETS.length +
      LIB_CREATURES.length +
      LIB_EFFECTS.length +
      LIB_PARTICLES.length +
      LIB_STRUCTURES.length;
    expect(total).toBe(1204);
  });

  it('keeps every hand-written block on its existing id', () => {
    for (const b of BLOCKS) expect(ids[b.key], b.key).toBe(b.id);
  });

  it('gives each library block a unique, stable id', () => {
    const seen = new Map<number, string>();
    for (const b of LIB_BLOCKS) {
      expect(ids[b.key], b.id).toBe(b.blockId);
      if (b.core) expect(b.key).toBe(b.core);
      expect(seen.get(b.blockId), `${b.id} shares id ${b.blockId}`).toBeUndefined();
      seen.set(b.blockId, b.id);
      if (b.core) expect(BLOCKS.some((c) => c.key === b.core)).toBe(true);
    }
    expect(Math.max(...Object.values(ids))).toBeLessThan(4096); // 12-bit ids (Phase 1)
  });

  it('points block tiles inside the atlas', () => {
    const n = LIB_ATLAS_COLS * LIB_ATLAS_ROWS;
    for (const b of LIB_BLOCKS)
      for (const t of Object.values(b.tiles)) expect(t >= 0 && t < n, b.id).toBe(true);
  });

  it('has unique ids within blocks and within items', () => {
    const dupes = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);
    expect(dupes(LIB_BLOCKS.map((b) => b.id))).toEqual([]);
    expect(dupes(ITEM_SHEETS.map((i) => i.id))).toEqual([]);
    const blockSet = new Set(LIB_BLOCKS.map((b) => b.id));
    expect(ITEM_SHEETS.filter((i) => blockSet.has(i.id)).map((i) => i.id)).toEqual([]);
  });

  it('has well-formed art for every 2D sprite', () => {
    const keys = [
      ...LIB_BLOCKS.map((b) => `block:${b.id}`),
      ...ITEM_SHEETS.map((i) => `item:${i.id}`),
      ...LIB_EFFECTS.map((e) => `effect:${e.id}`),
      ...LIB_PARTICLES.map((p) => `particle:${p.id}`),
    ];
    for (const k of keys) {
      const svg = LIBRARY_ART[k];
      expect(svg, k).toBeTruthy();
      expect(balanced(svg), k).toBe(true);
      expect(svg, k).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it('ships a rendered sprite for every creature and structure', () => {
    for (const c of [...LIB_CREATURES, ...LIB_STRUCTURES]) {
      const png = readFileSync(new URL(`../../public/${c.sprite}`, import.meta.url));
      expect(png.subarray(1, 4).toString(), c.id).toBe('PNG');
    }
  });
});
