/**
 * Procedurally painted block texture atlas (no image assets needed).
 * Sōzō's look: 32 px tiles with soft, low-contrast value noise and a calm, slightly warm palette,
 * rather than noisy high-contrast pixel art.
 */
import * as THREE from 'three';
import { mulberry32 } from './rng';
import { ATLAS_COLS, ATLAS_ROWS, TILE_NAMES, TILE_PX, type TileName } from '../world/tiles';

type RGB = [number, number, number];
type Put = (x: number, y: number, c: RGB, a?: number) => void;
type Painter = (px: Put, rnd: () => number) => void;

const N = TILE_PX;

/** Smooth, tileable value noise in [0, 1] (bilinear over a coarse lattice that wraps). */
function valueNoise(rnd: () => number, cells: number): (x: number, y: number) => number {
  const grid = Array.from({ length: cells * cells }, () => rnd());
  const at = (i: number, j: number) => grid[((j + cells) % cells) * cells + ((i + cells) % cells)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = (x / N) * cells;
    const fy = (y / N) * cells;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const tx = smooth(fx - i);
    const ty = smooth(fy - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * tx;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * tx;
    return a + (b - a) * ty;
  };
}

const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

/** Two-tone soft fill: blends `a` and `b` with layered value noise plus a whisper of grain. */
const soft =
  (a: RGB, b: RGB, cells = 4, grain = 0.04): Painter =>
  (px, rnd) => {
    const n1 = valueNoise(rnd, cells);
    const n2 = valueNoise(rnd, cells * 2);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const t = n1(x, y) * 0.7 + n2(x, y) * 0.3;
        px(x, y, scale(mix(a, b, t), 1 + (rnd() - 0.5) * grain));
      }
  };

/** Soft base with rounded flecks (ores, gravel). */
const flecked =
  (a: RGB, b: RGB, fleck: RGB, count: number, radius = 2.2): Painter =>
  (px, rnd) => {
    soft(a, b)(px, rnd);
    for (let k = 0; k < count; k++) {
      const cx = rnd() * N;
      const cy = rnd() * N;
      const r = radius * (0.7 + rnd() * 0.6);
      for (let y = Math.floor(cy - r); y <= cy + r; y++)
        for (let x = Math.floor(cx - r); x <= cx + r; x++) {
          const d = Math.hypot(x - cx, y - cy);
          if (d <= r) px((x + N) % N, (y + N) % N, scale(fleck, d < r * 0.5 ? 1.12 : 1));
        }
    }
  };

const MOSS_A: RGB = [104, 158, 92];
const MOSS_B: RGB = [132, 182, 104];
const SOIL_A: RGB = [128, 96, 74];
const SOIL_B: RGB = [148, 114, 88];
const STONE_A: RGB = [128, 132, 136];
const STONE_B: RGB = [150, 152, 154];
const WOOD_A: RGB = [190, 150, 104];
const WOOD_B: RGB = [206, 168, 120];
const SNOW_A: RGB = [232, 238, 244];
const SNOW_B: RGB = [246, 249, 252];

/** Side of a covered block: soil with a clean, gently curved cap of `top` colour (no jagged fringe). */
const capped =
  (topA: RGB, topB: RGB): Painter =>
  (px, rnd) => {
    const soil = valueNoise(rnd, 4);
    const cap = valueNoise(rnd, 2);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const edge = N * 0.28 + (cap(x, 0) - 0.5) * N * 0.08;
        if (y < edge) px(x, y, mix(topA, topB, soil(x, y)));
        else if (y < edge + 1.5)
          px(x, y, scale(mix(topA, SOIL_A, 0.6), 0.85)); // soft shadow under the cap
        else px(x, y, mix(SOIL_A, SOIL_B, soil(x, y)));
      }
  };

const PAINTERS: Record<TileName, Painter> = {
  grass_top: soft(MOSS_A, MOSS_B, 3),
  grass_side: capped(MOSS_A, MOSS_B),
  dirt: soft(SOIL_A, SOIL_B),
  stone: soft(STONE_A, STONE_B, 3, 0.05),
  sand: soft([222, 206, 160], [236, 222, 180], 3),
  water: (px, rnd) => {
    const n = valueNoise(rnd, 3);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const ripple = Math.sin(((x + y * 0.6) / N) * Math.PI * 4) * 0.5 + 0.5;
        px(x, y, mix([52, 116, 168], [84, 152, 196], n(x, y) * 0.6 + ripple * 0.4), 0.7);
      }
  },
  log_top: (px, rnd) => {
    const n = valueNoise(rnd, 4);
    const c = (N - 1) / 2;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const d = Math.hypot(x - c, y - c) + n(x, y) * 1.5;
        const bark = d > N * 0.44;
        const ring = Math.sin(d * 1.1) * 0.5 + 0.5;
        px(x, y, bark ? [104, 78, 56] : mix([196, 160, 112], [176, 138, 92], ring));
      }
  },
  log_side: (px, rnd) => {
    const n = valueNoise(rnd, 6);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const stripe = Math.sin((x / N) * Math.PI * 10 + n(x, y) * 3) * 0.5 + 0.5;
        px(x, y, mix([98, 74, 54], [124, 94, 68], stripe));
      }
  },
  leaves: (px, rnd) => {
    const n = valueNoise(rnd, 6);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const v = n(x, y);
        if (v < 0.22 && rnd() < 0.7) px(x, y, [0, 0, 0], 0);
        else px(x, y, mix([70, 128, 80], [106, 164, 100], v));
      }
  },
  planks: (px, rnd) => {
    const n = valueNoise(rnd, 8);
    const board = N / 4;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const row = Math.floor(y / board);
        const seamX = (row % 2 === 0 ? 0.3 : 0.75) * N;
        const seam = y % board === board - 1 || Math.abs(x - seamX) < 0.5;
        px(x, y, seam ? [150, 112, 76] : mix(WOOD_A, WOOD_B, n(x, y)));
      }
  },
  glass: (px) => {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const edge = x < 2 || y < 2 || x >= N - 2 || y >= N - 2;
        const glint = Math.abs(x - y - N * 0.2) < 1.2 && x > N * 0.25 && x < N * 0.6;
        if (edge) px(x, y, [214, 232, 236]);
        else if (glint) px(x, y, [240, 250, 252], 0.85);
        else px(x, y, [200, 230, 240], 0.08);
      }
  },
  cobblestone: (px, rnd) => {
    // Rounded river stones in soft mortar.
    const stones: [number, number, number, number][] = [];
    for (let k = 0; k < 9; k++)
      stones.push([rnd() * N, rnd() * N, N * (0.16 + rnd() * 0.08), 0.85 + rnd() * 0.3]);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        let best = Infinity;
        let shade = 1;
        for (const [cx, cy, r, s] of stones) {
          const dx = Math.min(Math.abs(x - cx), N - Math.abs(x - cx));
          const dy = Math.min(Math.abs(y - cy), N - Math.abs(y - cy));
          const d = Math.hypot(dx, dy) / r;
          if (d < best) {
            best = d;
            shade = s;
          }
        }
        px(x, y, best < 1 ? scale(mix(STONE_B, STONE_A, best), shade) : [104, 106, 108]);
      }
  },
  coal_ore: flecked(STONE_A, STONE_B, [236, 120, 64], 6),
  iron_ore: flecked(STONE_A, STONE_B, [214, 184, 160], 6),
  brick: (px, rnd) => {
    const n = valueNoise(rnd, 6);
    const h = N / 4;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const row = Math.floor(y / h);
        const mortar = y % h >= h - 2 || (x + (row % 2) * (N / 4)) % (N / 2) >= N / 2 - 2;
        px(x, y, mortar ? [214, 204, 190] : mix([178, 92, 72], [196, 112, 88], n(x, y)));
      }
  },
  snow: soft(SNOW_A, SNOW_B, 3, 0.02),
  snow_side: capped(SNOW_A, SNOW_B),
  crystal_ore: flecked(STONE_A, STONE_B, [120, 214, 236], 5, 2.6),
  gravel: flecked([132, 128, 122], [150, 146, 140], [176, 170, 162], 22, 1.6),
  bedrock: flecked([64, 66, 70], [80, 82, 86], [40, 42, 46], 18, 2.4),
  wool: soft([238, 234, 226], [248, 245, 240], 6, 0.03),
  lamp: (px, rnd) => {
    const n = valueNoise(rnd, 3);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const edge = x < 2 || y < 2 || x >= N - 2 || y >= N - 2;
        px(x, y, edge ? [120, 92, 66] : mix([255, 228, 170], [255, 244, 210], n(x, y)));
      }
  },
};

export function paintAtlas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * TILE_PX;
  canvas.height = ATLAS_ROWS * TILE_PX;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.createImageData(canvas.width, canvas.height);
  TILE_NAMES.forEach((name, i) => {
    const ox = (i % ATLAS_COLS) * TILE_PX;
    const oy = Math.floor(i / ATLAS_COLS) * TILE_PX;
    const rnd = mulberry32(1000 + i * 7919);
    PAINTERS[name]((x, y, c, a = 1) => {
      if (x < 0 || y < 0 || x >= N || y >= N) return;
      const o = ((oy + y) * canvas.width + ox + x) * 4;
      img.data[o] = Math.max(0, Math.min(255, c[0]));
      img.data[o + 1] = Math.max(0, Math.min(255, c[1]));
      img.data[o + 2] = Math.max(0, Math.min(255, c[2]));
      img.data[o + 3] = Math.round(a * 255);
    }, rnd);
  });
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function createAtlasTexture(): { texture: THREE.CanvasTexture; canvas: HTMLCanvasElement } {
  const canvas = paintAtlas();
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, canvas };
}
