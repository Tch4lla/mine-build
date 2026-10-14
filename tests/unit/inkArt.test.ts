import { describe, expect, it } from 'vitest';
import { ITEMS } from '../../src/items/items';
import { hasArt, itemSvg } from '../../src/items/inkArt';

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

describe('ink item art', () => {
  const drawn = ITEMS.filter((d) => d.block === undefined || d.tool);

  it('has a bespoke drawing for every non-block item', () => {
    expect(drawn.filter((d) => !hasArt(d.id)).map((d) => d.id)).toEqual([]);
  });

  it('produces well-formed SVG with finite numbers', () => {
    for (const d of drawn) {
      for (const svg of [itemSvg(d.id), itemSvg(d.id, { stroke: true, fuse: d.tool ? 'rock' : undefined })]) {
        expect(balanced(svg), d.id).toBe(true);
        expect(svg, d.id).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });
});
