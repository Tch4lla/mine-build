export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 128;
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT;

export function blockIndex(x: number, y: number, z: number): number {
  return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
}

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export class ChunkData {
  readonly blocks: Uint8Array;
  constructor(
    readonly cx: number,
    readonly cz: number,
    blocks?: Uint8Array,
  ) {
    this.blocks = blocks ?? new Uint8Array(CHUNK_VOLUME);
  }

  get(x: number, y: number, z: number): number {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    return this.blocks[blockIndex(x, y, z)];
  }

  set(x: number, y: number, z: number, id: number): void {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    this.blocks[blockIndex(x, y, z)] = id;
  }
}

/** Run-length encode block data: pairs of (runLength 1..255, value). */
export function rleEncode(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    const v = data[i];
    let run = 1;
    while (i + run < data.length && data[i + run] === v && run < 255) run++;
    out.push(run, v);
    i += run;
  }
  return Uint8Array.from(out);
}

export function rleDecode(rle: Uint8Array, length = CHUNK_VOLUME): Uint8Array {
  const out = new Uint8Array(length);
  let o = 0;
  for (let i = 0; i + 1 < rle.length; i += 2) {
    out.fill(rle[i + 1], o, o + rle[i]);
    o += rle[i];
  }
  if (o !== length) throw new Error(`RLE length mismatch: ${o} != ${length}`);
  return out;
}
