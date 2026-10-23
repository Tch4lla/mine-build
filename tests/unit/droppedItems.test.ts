import { describe, expect, it } from 'vitest';
import { landsOn } from '../../src/entities/droppedItems';

describe('dropped items', () => {
  it('land on a block only when coming down onto its top', () => {
    // Falling from above into the block at y = 4 (top at 5): rests on it.
    expect(landsOn(5.2, 4)).toBe(true);
    expect(landsOn(5, 4)).toBe(true);
    // Thrown sideways into a wall at the same height: stops instead of climbing it.
    expect(landsOn(4.4, 4)).toBe(false);
  });
});
