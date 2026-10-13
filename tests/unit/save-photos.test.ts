import { describe, expect, it } from 'vitest';
import {
  base64ToBytes,
  bytesToBase64,
  referencedPhotoIds,
  validateBundle,
  type WorldMeta,
} from '../../src/save/serialize';
import { fitWithin, frameDimensions } from '../../src/photos/importPhoto';
import { rleEncode, rleDecode } from '../../src/world/chunk';
import { TerrainGenerator } from '../../src/world/terrain';

describe('save serialization', () => {
  it('base64 round-trips RLE chunk data', () => {
    const blocks = new TerrainGenerator(9).generate(0, 0).blocks;
    const b64 = bytesToBase64(rleEncode(blocks));
    expect(rleDecode(base64ToBytes(b64))).toEqual(blocks);
  });

  it('collects every referenced photo', () => {
    const meta = {
      frames: [{ photoId: 'a' }],
      photoBlocks: [{ photoId: 'b' }],
      inventory: {
        selected: 0,
        slots: [
          { id: 'photo_frame', count: 1, data: { photoId: 'c' } },
          null,
          { id: 'shield', count: 1, data: { photoId: 'd' } },
        ],
      },
      dropped: [{ stack: { id: 'photo_block', count: 2, data: { photoId: 'e' } }, pos: [0, 0, 0] }],
    } as unknown as WorldMeta;
    expect([...referencedPhotoIds(meta)].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('rejects files that are not world exports', () => {
    expect(() => validateBundle({ hello: 1 })).toThrow(/not a Sōzō world/);
    expect(() => validateBundle({ format: 'sozo-world', version: 999, meta: {}, chunks: {} })).toThrow(
      /newer version/,
    );
    expect(validateBundle({ format: 'sozo-world', version: 1, meta: {}, chunks: {} }).photos).toEqual([]);
  });

  it('still imports worlds exported before the rename', () => {
    expect(validateBundle({ format: 'mine-build-world', version: 1, meta: {}, chunks: {} }).format).toBe(
      'mine-build-world',
    );
  });
});

describe('photo sizing', () => {
  it('downscales keeping the aspect ratio', () => {
    expect(fitWithin(4000, 3000)).toEqual({ w: 1024, h: 768 });
    expect(fitWithin(1080, 1920)).toEqual({ w: 576, h: 1024 });
  });
  it('never upscales small images', () => {
    expect(fitWithin(300, 200)).toEqual({ w: 300, h: 200 });
  });
  it('rejects empty images', () => {
    expect(() => fitWithin(0, 10)).toThrow();
  });
  it('sizes frames by their longest side', () => {
    expect(frameDimensions(1600, 900, 3)).toEqual({ w: 3, h: 3 * (900 / 1600) });
    expect(frameDimensions(900, 1600, 2)).toEqual({ w: 2 * (900 / 1600), h: 2 });
  });
});
