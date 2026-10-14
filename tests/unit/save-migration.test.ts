import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import fixture from '../fixtures/world-v1.json';
import { GAME_SLUG } from '../../src/brand';
import { createWorld, exportWorld, importWorld, loadWorld, saveWorld } from '../../src/save/saveManager';
import { BRICK, LAMP, STONE } from '../../src/world/blocks';
import { ChunkData, blockIndex, packBlock, rleEncode } from '../../src/world/chunk';
import { base64ToBytes } from '../../src/save/serialize';

const PILLAR = blockIndex(8, 41, 8);
const LAMP_AT = blockIndex(8, 46, 8);

describe('save format migration (v1 → v2)', () => {
  it('imports a version 1 export with its blocks intact', async () => {
    const meta = await importWorld(JSON.stringify(fixture));
    const loaded = (await loadWorld(meta.id))!;
    const blocks = loaded.chunks.get('0,0')!;
    expect(blocks[PILLAR]).toBe(BRICK);
    expect(blocks[LAMP_AT]).toBe(LAMP);
    // Re-exported worlds use the new format and still round-trip.
    const again = await importWorld(await exportWorld(meta.id));
    expect((await loadWorld(again.id))!.chunks.get('0,0')).toEqual(blocks);
  });

  it('reads old chunk rows next to new ones in the same world', async () => {
    const meta = await createWorld('Mixed', 1, true);
    // A chunk row written by the old game: 8-bit RLE and no version tag.
    const db = await openDB(GAME_SLUG);
    await db.put('chunks', {
      k: `${meta.id}|0,0`,
      world: meta.id,
      key: '0,0',
      rle: base64ToBytes(fixture.chunks['0,0']),
    });
    db.close();

    // This session changes a different chunk (with an id above 255 and a state) and saves it.
    const changed = new ChunkData(1, 0);
    changed.set(0, 50, 0, 811, 3);
    changed.set(1, 50, 0, STONE);
    await saveWorld(meta, new Map([['1,0', changed.blocks]]));

    const loaded = (await loadWorld(meta.id))!;
    expect(loaded.chunks.get('0,0')![PILLAR]).toBe(BRICK);
    const c = loaded.chunks.get('1,0')!;
    expect(c[blockIndex(0, 50, 0)]).toBe(packBlock(811, 3));
    expect(c[blockIndex(1, 50, 0)]).toBe(STONE);
    expect(rleEncode(c)).toEqual(rleEncode(changed.blocks));
  });
});
