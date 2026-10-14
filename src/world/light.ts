/**
 * Block light: torches, lanterns, fire and lamps light the blocks around them. Light spreads
 * outwards one level per block (a level-15 lantern reaches 14 blocks) and opaque blocks stop it.
 * Pure: the world passes in lookups, so this runs the same in tests.
 *
 * A chunk's light only depends on sources within 15 blocks, so it is worked out over the chunk and
 * its eight neighbours (a 48 × 48 region) and read back for the chunk plus a one-block border.
 */
import { CHUNK_HEIGHT, CHUNK_SIZE } from './chunk';

/** Region spans one chunk either side of the one being lit. */
const R = CHUNK_SIZE * 3;
const H = CHUNK_HEIGHT;
const index = (x: number, y: number, z: number) => x + z * R + y * R * R;
/** Work buffers, reused between calls: a queue of cell indices (processed in order of falling
 * level, sources first) and which cells stop light (-1 not looked up yet). */
const QUEUE = new Int32Array(R * R * H);
const OPAQUE = new Int8Array(R * R * H);

export interface LightSource {
  /** Chunk-local position (may lie in a neighbouring chunk: -16..31). */
  x: number;
  y: number;
  z: number;
  level: number;
}

/** Light at a chunk-local cell (x and z from -1 to 16), 0–15. */
export type LightSampler = (x: number, y: number, z: number) => number;

/**
 * Spreads light from `sources` (positions relative to the chunk being lit). `getBlock` takes the
 * same chunk-local coordinates (-16..31) and `opaque` says which blocks stop light.
 */
export function spreadLight(
  sources: LightSource[],
  getBlock: (x: number, y: number, z: number) => number,
  opaque: (id: number) => boolean,
): LightSampler {
  const light = new Uint8Array(R * R * H);
  const queue = QUEUE;
  const opaqueCache = OPAQUE.fill(-1);
  let head = 0;
  let tail = 0;
  for (const s of [...sources].sort((a, b) => b.level - a.level)) {
    const x = s.x + CHUNK_SIZE;
    const z = s.z + CHUNK_SIZE;
    if (x < 0 || x >= R || z < 0 || z >= R || s.y < 0 || s.y >= H) continue;
    const i = index(x, s.y, z);
    if (light[i] >= s.level) continue;
    light[i] = s.level;
    queue[tail++] = i;
  }
  const blocks = (i: number, x: number, y: number, z: number): boolean => {
    let o = opaqueCache[i];
    if (o < 0) {
      o = opaque(getBlock(x - CHUNK_SIZE, y, z - CHUNK_SIZE)) ? 1 : 0;
      opaqueCache[i] = o;
    }
    return o === 1;
  };
  while (head < tail) {
    const i = queue[head++];
    const level = light[i] - 1;
    if (level <= 0) continue;
    const x = i % R;
    const z = Math.floor(i / R) % R;
    const y = Math.floor(i / (R * R));
    const visit = (nx: number, ny: number, nz: number) => {
      if (nx < 0 || nx >= R || nz < 0 || nz >= R || ny < 0 || ny >= H) return;
      const n = index(nx, ny, nz);
      if (light[n] >= level || blocks(n, nx, ny, nz)) return;
      light[n] = level;
      queue[tail++] = n;
    };
    visit(x + 1, y, z);
    visit(x - 1, y, z);
    visit(x, y + 1, z);
    visit(x, y - 1, z);
    visit(x, y, z + 1);
    visit(x, y, z - 1);
  }
  return (x, y, z) => {
    if (y < 0 || y >= H) return 0;
    const rx = x + CHUNK_SIZE;
    const rz = z + CHUNK_SIZE;
    if (rx < 0 || rx >= R || rz < 0 || rz >= R) return 0;
    return light[index(rx, y, rz)];
  };
}
