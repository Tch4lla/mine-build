export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 128;
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT;

export function blockIndex(x: number, y: number, z: number): number {
  return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
}

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

/**
 * Each cell packs a block id (low 12 bits, up to 4,096 block types) and a block state (high 4
 * bits: facing, top/bottom half, open/closed) into one 16-bit value.
 */
export const ID_BITS = 12;
export const MAX_BLOCK_ID = (1 << ID_BITS) - 1;
export const MAX_STATE = (1 << (16 - ID_BITS)) - 1;

export function packBlock(id: number, state = 0): number {
  return (id & MAX_BLOCK_ID) | ((state & MAX_STATE) << ID_BITS);
}

export function blockId(v: number): number {
  return v & MAX_BLOCK_ID;
}

export function blockState(v: number): number {
  return v >>> ID_BITS;
}

export class ChunkData {
  readonly blocks: Uint16Array;
  constructor(
    readonly cx: number,
    readonly cz: number,
    blocks?: Uint16Array,
  ) {
    this.blocks = blocks ?? new Uint16Array(CHUNK_VOLUME);
  }

  /** The block id at a position (without its state). */
  get(x: number, y: number, z: number): number {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    return this.blocks[blockIndex(x, y, z)] & MAX_BLOCK_ID;
  }

  getState(x: number, y: number, z: number): number {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    return this.blocks[blockIndex(x, y, z)] >>> ID_BITS;
  }

  /** Sets a block; its state defaults to 0, so replacing a block clears the old state. */
  set(x: number, y: number, z: number, id: number, state = 0): void {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    this.blocks[blockIndex(x, y, z)] = packBlock(id, state);
  }
}

/**
 * Run-length encode block data (save format v2): pairs of uint16 (runLength 1..65535, value),
 * little-endian, as bytes so they store and base64-encode like any other binary blob.
 */
export function rleEncode(data: Uint16Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    const v = data[i];
    let run = 1;
    while (i + run < data.length && data[i + run] === v && run < 0xffff) run++;
    out.push(run, v);
    i += run;
  }
  const bytes = new Uint8Array(out.length * 2);
  const view = new DataView(bytes.buffer);
  out.forEach((n, k) => view.setUint16(k * 2, n, true));
  return bytes;
}

export function rleDecode(rle: Uint8Array, length = CHUNK_VOLUME): Uint16Array {
  const out = new Uint16Array(length);
  const view = new DataView(rle.buffer, rle.byteOffset, rle.byteLength);
  let o = 0;
  for (let i = 0; i + 3 < rle.length; i += 4) {
    const run = view.getUint16(i, true);
    out.fill(view.getUint16(i + 2, true), o, o + run);
    o += run;
  }
  if (o !== length) throw new Error(`RLE length mismatch: ${o} != ${length}`);
  return out;
}

/** Decode save format v1 (pairs of bytes: runLength 1..255, 8-bit block id) into v2 cells. */
export function rleDecodeV1(rle: Uint8Array, length = CHUNK_VOLUME): Uint16Array {
  const out = new Uint16Array(length);
  let o = 0;
  for (let i = 0; i + 1 < rle.length; i += 2) {
    out.fill(rle[i + 1], o, o + rle[i]);
    o += rle[i];
  }
  if (o !== length) throw new Error(`RLE length mismatch: ${o} != ${length}`);
  return out;
}
