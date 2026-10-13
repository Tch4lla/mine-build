/** Deterministic, seeded terrain generation. */
import { createNoise2D, createNoise3D } from 'simplex-noise';
import { hash3, mulberry32 } from '../engine/rng';
import {
  AIR,
  BEDROCK,
  COAL_ORE,
  CRYSTAL_ORE,
  DIRT,
  GRASS,
  GRAVEL,
  IRON_ORE,
  LEAVES,
  LOG,
  SAND,
  SNOW,
  STONE,
  WATER,
} from './blocks';
import { CHUNK_HEIGHT, CHUNK_SIZE, ChunkData } from './chunk';

export const SEA_LEVEL = 34;

export class TerrainGenerator {
  private readonly height2: ReturnType<typeof createNoise2D>;
  private readonly detail2: ReturnType<typeof createNoise2D>;
  private readonly biome2: ReturnType<typeof createNoise2D>;
  private readonly cave3: ReturnType<typeof createNoise3D>;

  constructor(readonly seed: number) {
    const rng = mulberry32(seed);
    this.height2 = createNoise2D(rng);
    this.detail2 = createNoise2D(rng);
    this.biome2 = createNoise2D(rng);
    this.cave3 = createNoise3D(rng);
  }

  /** Biome value in [-1, 1]: < -0.25 desert, > 0.35 mountains. */
  biomeAt(x: number, z: number): number {
    return this.biome2(x / 420, z / 420);
  }

  heightAt(x: number, z: number): number {
    const b = this.biomeAt(x, z);
    const mountain = Math.max(0, b - 0.15) * 1.6;
    let h = 0;
    h += this.height2(x / 180, z / 180) * 10;
    h += this.height2(x / 60 + 100, z / 60 - 100) * 5;
    h += this.detail2(x / 18, z / 18) * 1.6;
    const ridged = 1 - Math.abs(this.height2(x / 110 - 300, z / 110 + 300));
    h += ridged * ridged * 34 * mountain;
    const base = SEA_LEVEL + 4 + (b < -0.25 ? -1 : 0);
    return Math.max(4, Math.min(CHUNK_HEIGHT - 12, Math.floor(base + h)));
  }

  generate(cx: number, cz: number): ChunkData {
    const chunk = new ChunkData(cx, cz);
    const S = CHUNK_SIZE;
    const heights = new Int32Array(S * S);

    for (let z = 0; z < S; z++) {
      for (let x = 0; x < S; x++) {
        const wx = cx * S + x;
        const wz = cz * S + z;
        const h = this.heightAt(wx, wz);
        heights[x + z * S] = h;
        const biome = this.biomeAt(wx, wz);
        const desert = biome < -0.25;
        const beach = h <= SEA_LEVEL + 1;
        const snowy = h > SEA_LEVEL + 34;

        for (let y = 0; y <= Math.max(h, SEA_LEVEL); y++) {
          let id = AIR;
          if (y === 0) id = BEDROCK;
          else if (y <= h) {
            const depth = h - y;
            if (depth === 0) id = desert || beach ? SAND : snowy ? SNOW : y < SEA_LEVEL ? GRAVEL : GRASS;
            else if (depth < 4) id = desert || beach ? SAND : DIRT;
            else {
              id = STONE;
              const r = hash3(wx, y, wz, this.seed);
              if (r < 0.012) id = COAL_ORE;
              else if (r < 0.018 && y < 50) id = IRON_ORE;
              else if (r < 0.0205 && y < 24) id = CRYSTAL_ORE;
              else if (r < 0.03 && y < 40) id = GRAVEL;
            }
            // Caves: carve out stone below the surface.
            if (y > 4 && depth > 3 && this.cave3(wx / 28, y / 18, wz / 28) > 0.62) id = AIR;
          } else if (y <= SEA_LEVEL) id = WATER;
          if (id !== AIR) chunk.set(x, y, z, id);
        }
      }
    }

    // Trees: consider columns slightly outside the chunk so canopies cross chunk borders deterministically.
    const M = 3;
    for (let z = -M; z < S + M; z++) {
      for (let x = -M; x < S + M; x++) {
        const wx = cx * S + x;
        const wz = cz * S + z;
        const t = hash3(wx, 7, wz, this.seed ^ 0x5bd1e995);
        if (t > 0.012) continue;
        const inside = x >= 0 && x < S && z >= 0 && z < S;
        const h = inside ? heights[x + z * S] : this.heightAt(wx, wz);
        if (h <= SEA_LEVEL + 1 || h > SEA_LEVEL + 30) continue;
        if (this.biomeAt(wx, wz) < -0.25) continue;
        const trunk = 4 + Math.floor(hash3(wx, 9, wz, this.seed) * 3);
        this.placeTree(chunk, x, h + 1, z, trunk, wx, wz);
      }
    }
    return chunk;
  }

  private placeTree(
    chunk: ChunkData,
    x: number,
    y: number,
    z: number,
    trunk: number,
    wx: number,
    wz: number,
  ): void {
    const S = CHUNK_SIZE;
    const put = (px: number, py: number, pz: number, id: number, replace: boolean) => {
      if (px < 0 || px >= S || pz < 0 || pz >= S || py >= CHUNK_HEIGHT) return;
      if (!replace && chunk.get(px, py, pz) !== AIR) return;
      chunk.set(px, py, pz, id);
    };
    const top = y + trunk;
    for (let dy = -2; dy <= 1; dy++) {
      const r = dy >= 0 ? 1 : 2;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (
            Math.abs(dx) === r &&
            Math.abs(dz) === r &&
            (dy === 1 || hash3(wx + dx, top + dy, wz + dz, 3) < 0.5)
          )
            continue;
          put(x + dx, top + dy, z + dz, LEAVES, false);
        }
      }
    }
    for (let i = 0; i < trunk; i++) put(x, y + i, z, LOG, true);
  }
}
