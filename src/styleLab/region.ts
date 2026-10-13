/** A small patch of real game terrain (plus a hut) shared by every style preview. */
import { TerrainGenerator, SEA_LEVEL } from '../world/terrain';
import { CHUNK_HEIGHT, CHUNK_SIZE, type ChunkData } from '../world/chunk';
import { AIR, GLASS, IS_SOLID, LOG, PLANKS, WATER_STRENGTH, BRICK } from '../world/blocks';

export interface Region {
  x0: number;
  z0: number;
  size: number;
  minY: number;
  maxY: number;
  get(x: number, y: number, z: number): number;
  set(x: number, y: number, z: number, id: number): void;
  surface(x: number, z: number): number;
  /** Where the hut was built (ground level at its centre). */
  hut: { x: number; y: number; z: number };
}

export function buildRegion(seed: number, cx: number, cz: number, size: number): Region {
  const gen = new TerrainGenerator(seed);
  const chunks = new Map<string, ChunkData>();
  const x0 = cx - size / 2;
  const z0 = cz - size / 2;
  const chunkAt = (x: number, z: number) => {
    const kx = Math.floor(x / CHUNK_SIZE);
    const kz = Math.floor(z / CHUNK_SIZE);
    const k = `${kx},${kz}`;
    let c = chunks.get(k);
    if (!c) chunks.set(k, (c = gen.generate(kx, kz)));
    return c;
  };
  const inside = (x: number, z: number) => x >= x0 && x < x0 + size && z >= z0 && z < z0 + size;
  const get = (x: number, y: number, z: number) => {
    if (!inside(x, z) || y < 0 || y >= CHUNK_HEIGHT) return AIR;
    const c = chunkAt(x, z);
    return c.get(x - c.cx * CHUNK_SIZE, y, z - c.cz * CHUNK_SIZE);
  };
  const set = (x: number, y: number, z: number, id: number) => {
    if (!inside(x, z)) return;
    const c = chunkAt(x, z);
    c.set(x - c.cx * CHUNK_SIZE, y, z - c.cz * CHUNK_SIZE, id);
  };
  const surface = (x: number, z: number) => {
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      const id = get(x, y, z);
      if (IS_SOLID[id] || WATER_STRENGTH[id]) return y;
    }
    return 0;
  };
  const region: Region = { x0, z0, size, minY: 0, maxY: 0, get, set, surface, hut: { x: cx, y: 0, z: cz } };

  // A little hut on dry land near the middle, so architecture shows up in every style.
  let hx = cx,
    hz = cz,
    best = Infinity;
  for (let dz = -10; dz <= 10; dz++)
    for (let dx = -10; dx <= 10; dx++) {
      const x = cx + dx,
        z = cz + dz;
      const h = surface(x, z);
      if (h <= SEA_LEVEL + 1 || WATER_STRENGTH[get(x, h, z)]) continue;
      // Prefer flat spots close to the centre.
      let rough = 0;
      for (let a = -3; a <= 3; a++)
        for (let b = -3; b <= 3; b++) rough += Math.abs(surface(x + a, z + b) - h);
      const score = rough + Math.hypot(dx, dz) * 0.5;
      if (score < best) [best, hx, hz] = [score, x, z];
    }
  const base = surface(hx, hz) + 1;
  region.hut = { x: hx, y: base, z: hz };
  for (let a = -3; a <= 3; a++)
    for (let b = -3; b <= 3; b++) {
      for (let y = base - 1; y >= base - 4; y--)
        if (!IS_SOLID[get(hx + a, y, hz + b)]) set(hx + a, y, hz + b, PLANKS);
      for (let y = base; y < base + 8; y++) set(hx + a, y, hz + b, AIR);
    }
  for (let a = -2; a <= 2; a++)
    for (let b = -2; b <= 2; b++) {
      const edge = Math.abs(a) === 2 || Math.abs(b) === 2;
      const corner = Math.abs(a) === 2 && Math.abs(b) === 2;
      for (let y = 0; y < 3; y++) {
        if (!edge) continue;
        const door = b === 2 && a === 0 && y < 2;
        const window = y === 1 && ((Math.abs(a) === 2 && b === 0) || (b === -2 && a === 0));
        if (door) continue;
        set(hx + a, base + y, hz + b, corner ? LOG : window ? GLASS : PLANKS);
      }
    }
  // Stepped roof.
  for (let level = 0; level < 3; level++) {
    const r = 3 - level;
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) set(hx + a, base + 3 + level, hz + b, BRICK);
  }

  let minY = CHUNK_HEIGHT,
    maxY = 0;
  for (let z = z0; z < z0 + size; z++)
    for (let x = x0; x < x0 + size; x++) {
      const h = surface(x, z);
      minY = Math.min(minY, h);
      maxY = Math.max(maxY, h);
    }
  region.minY = Math.max(0, minY - 6);
  region.maxY = maxY + 2;
  return region;
}

/** Whether a voxel's face towards (x+dx, ...) is exposed. */
export function exposed(
  r: Region,
  x: number,
  y: number,
  z: number,
  dx: number,
  dy: number,
  dz: number,
): boolean {
  const n = r.get(x + dx, y + dy, z + dz);
  return !IS_SOLID[n] || (n === GLASS && r.get(x, y, z) !== GLASS);
}
