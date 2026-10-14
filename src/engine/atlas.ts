/**
 * Procedurally painted block texture atlas (no image assets needed).
 *
 * Sōzō's "Ink & Wash" look: blocks are flat washes of muted ink colours with only a faint paper
 * grain. Shape comes from toon lighting bands and the ink outline pass (see view/inkPass.ts),
 * not from busy pixel textures.
 */
import * as THREE from 'three';
import { mulberry32 } from './rng';
import { ATLAS_COLS, ATLAS_ROWS, TILE_NAMES, TILE_PX, type TileName } from '../world/tiles';

type RGB = [number, number, number];
type Put = (x: number, y: number, c: RGB, a?: number) => void;
type Painter = (px: Put, rnd: () => number) => void;

const N = TILE_PX;
const rgb = (hex: number): RGB => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

/** The palette: muted, paper-friendly inks. */
export const INK = {
  moss: rgb(0x9db58a),
  mossSide: rgb(0x8f9572),
  soil: rgb(0x8a7a62),
  sand: rgb(0xe6d6b0),
  stone: rgb(0xb8b4aa),
  cobble: rgb(0xa9a59c),
  gravel: rgb(0xaaa49a),
  snow: rgb(0xf6f1e6),
  bark: rgb(0x6e5440),
  wood: rgb(0xc9a57a),
  leaves: rgb(0x78a37e),
  glass: rgb(0xd9eaea),
  brick: rgb(0xc0533a),
  water: rgb(0x5d8fa8),
  bedrock: rgb(0x55534f),
  wool: rgb(0xf2ece0),
  lamp: rgb(0xf7dc9a),
  vermilion: rgb(0xd8573c),
  ember: rgb(0xe08a4a),
  iron: rgb(0xd8c4b0),
  crystal: rgb(0x8fd0dc),
};

/** A flat wash with the faintest grain (so large surfaces don't look plastic). */
const wash =
  (c: RGB, grain = 0.035): Painter =>
  (px, rnd) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) px(x, y, scale(c, 1 + (rnd() - 0.5) * grain));
  };

/** A wash with a few soft-edged flecks (ores, gravel). */
const flecked =
  (base: RGB, fleck: RGB, count: number, radius: number): Painter =>
  (px, rnd) => {
    wash(base)(px, rnd);
    for (let k = 0; k < count; k++) {
      const cx = rnd() * N;
      const cy = rnd() * N;
      const r = radius * (0.7 + rnd() * 0.6);
      for (let y = Math.floor(cy - r); y <= cy + r; y++)
        for (let x = Math.floor(cx - r); x <= cx + r; x++)
          if (Math.hypot(x - cx, y - cy) <= r) px((x + N) % N, (y + N) % N, fleck);
    }
  };

/** Side of a covered block: a clean band of the top colour over the side colour. */
const capped =
  (top: RGB, side: RGB, band = 0.25): Painter =>
  (px, rnd) => {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) px(x, y, scale(y < N * band ? top : side, 1 + (rnd() - 0.5) * 0.03));
  };

/** Horizontal brush strokes (wood grain, water). */
const strokes =
  (base: RGB, line: RGB, every: number, alpha = 1): Painter =>
  (px, rnd) => {
    for (let y = 0; y < N; y++) {
      const onLine = y % every === every - 1;
      for (let x = 0; x < N; x++)
        px(x, y, onLine && rnd() < 0.85 ? line : scale(base, 1 + (rnd() - 0.5) * 0.03), alpha);
    }
  };

const PAINTERS: Record<TileName, Painter> = {
  grass_top: wash(INK.moss),
  grass_side: capped(INK.moss, INK.mossSide),
  dirt: wash(INK.soil),
  stone: wash(INK.stone),
  sand: wash(INK.sand),
  water: strokes(INK.water, scale(INK.water, 1.12), 8, 0.78),
  log_top: (px, rnd) => {
    const c = (N - 1) / 2;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const d = Math.hypot(x - c, y - c);
        const ring = Math.floor(d / (N / 8)) % 2 === 0;
        px(x, y, d > N * 0.44 ? INK.bark : scale(INK.wood, ring ? 1 : 0.92 + (rnd() - 0.5) * 0.02));
      }
  },
  log_side: strokes(INK.bark, scale(INK.bark, 0.9), 8),
  // Solid foliage: gaps would each get an ink outline and turn trees into noise.
  leaves: wash(INK.leaves, 0.05),
  planks: (px, rnd) => {
    const board = N / 4;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const seam = y % board === board - 1;
        px(x, y, seam ? scale(INK.wood, 0.78) : scale(INK.wood, 1 + (rnd() - 0.5) * 0.03));
      }
  },
  glass: (px) => {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const edge = x < 2 || y < 2 || x >= N - 2 || y >= N - 2;
        if (edge) px(x, y, INK.glass);
        else px(x, y, INK.glass, 0);
      }
  },
  cobblestone: flecked(INK.cobble, scale(INK.cobble, 0.88), 7, N * 0.12),
  coal_ore: flecked(INK.stone, INK.ember, 5, N * 0.07),
  iron_ore: flecked(INK.stone, INK.iron, 5, N * 0.07),
  brick: (px, rnd) => {
    const h = N / 4;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const row = Math.floor(y / h);
        const mortar = y % h === h - 1 || (x + (row % 2) * (N / 4)) % (N / 2) === 0;
        px(x, y, mortar ? rgb(0xe3d6c2) : scale(INK.brick, 1 + (rnd() - 0.5) * 0.03));
      }
  },
  snow: wash(INK.snow, 0.02),
  snow_side: capped(INK.snow, INK.soil, 0.3),
  crystal_ore: flecked(INK.stone, INK.crystal, 4, N * 0.09),
  gravel: flecked(INK.gravel, scale(INK.gravel, 0.9), 14, N * 0.05),
  bedrock: flecked(INK.bedrock, scale(INK.bedrock, 0.8), 10, N * 0.08),
  wool: wash(INK.wool, 0.02),
  lamp: (px, rnd) => {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const edge = x < 2 || y < 2 || x >= N - 2 || y >= N - 2;
        px(x, y, edge ? INK.bark : scale(INK.lamp, 1 + (rnd() - 0.5) * 0.02));
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

/** Three-band gradient for MeshToonMaterial: shadow, mid-tone, light. */
let toonRamp: THREE.DataTexture | null = null;
export function toonGradient(): THREE.DataTexture {
  if (!toonRamp) {
    const steps = new Uint8Array([105, 180, 255]);
    toonRamp = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
    toonRamp.minFilter = toonRamp.magFilter = THREE.NearestFilter;
    toonRamp.needsUpdate = true;
  }
  return toonRamp;
}
