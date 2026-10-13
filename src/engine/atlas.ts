/** Procedurally painted block texture atlas (no image assets needed). */
import * as THREE from 'three';
import { mulberry32 } from './rng';
import { ATLAS_COLS, ATLAS_ROWS, TILE_NAMES, TILE_PX, type TileName } from '../world/tiles';

type RGB = [number, number, number];
type Painter = (px: (x: number, y: number, c: RGB, a?: number) => void, rnd: () => number) => void;

const jitter = (c: RGB, rnd: () => number, amt: number): RGB => {
  const k = 1 + (rnd() - 0.5) * amt;
  return [c[0] * k, c[1] * k, c[2] * k];
};

const noiseFill =
  (base: RGB, amt = 0.25): Painter =>
  (px, rnd) => {
    for (let y = 0; y < TILE_PX; y++) for (let x = 0; x < TILE_PX; x++) px(x, y, jitter(base, rnd, amt));
  };

const speckled =
  (base: RGB, spot: RGB, density: number): Painter =>
  (px, rnd) => {
    noiseFill(base, 0.2)(px, rnd);
    for (let y = 0; y < TILE_PX; y++)
      for (let x = 0; x < TILE_PX; x++) {
        if (rnd() < density) {
          px(x, y, jitter(spot, rnd, 0.2));
          if (x + 1 < TILE_PX && rnd() < 0.6) px(x + 1, y, jitter(spot, rnd, 0.2));
          if (y + 1 < TILE_PX && rnd() < 0.6) px(x, y + 1, jitter(spot, rnd, 0.2));
        }
      }
  };

const GRASS: RGB = [96, 168, 64];
const DIRT: RGB = [134, 96, 67];
const STONE: RGB = [125, 125, 125];
const WOOD: RGB = [176, 134, 84];
const SNOW: RGB = [238, 244, 250];

const PAINTERS: Record<TileName, Painter> = {
  grass_top: noiseFill(GRASS, 0.3),
  grass_side: (px, rnd) => {
    noiseFill(DIRT, 0.25)(px, rnd);
    for (let x = 0; x < TILE_PX; x++) {
      const d = 3 + Math.floor(rnd() * 3);
      for (let y = 0; y < d; y++) px(x, y, jitter(GRASS, rnd, 0.3));
    }
  },
  dirt: speckled(DIRT, [100, 70, 48], 0.08),
  stone: speckled(STONE, [105, 105, 108], 0.12),
  sand: noiseFill([219, 207, 150], 0.12),
  water: (px, rnd) => {
    for (let y = 0; y < TILE_PX; y++)
      for (let x = 0; x < TILE_PX; x++) {
        const wave = Math.sin((x + y * 0.5) * 0.8) * 0.08;
        const c = jitter([48, 100, 200], rnd, 0.1);
        px(x, y, [c[0] * (1 + wave), c[1] * (1 + wave), c[2] * (1 + wave)], 0.72);
      }
  },
  log_top: (px, rnd) => {
    for (let y = 0; y < TILE_PX; y++)
      for (let x = 0; x < TILE_PX; x++) {
        const d = Math.hypot(x - 7.5, y - 7.5);
        const ring = Math.floor(d) % 2 === 0;
        const edge = d > 6.8;
        px(x, y, jitter(edge ? [92, 68, 40] : ring ? [182, 146, 92] : [160, 124, 76], rnd, 0.1));
      }
  },
  log_side: (px, rnd) => {
    for (let x = 0; x < TILE_PX; x++) {
      const c = jitter([104, 78, 46], rnd, 0.3);
      for (let y = 0; y < TILE_PX; y++) px(x, y, jitter(c, rnd, 0.12));
    }
  },
  leaves: (px, rnd) => {
    for (let y = 0; y < TILE_PX; y++)
      for (let x = 0; x < TILE_PX; x++) {
        if (rnd() < 0.18) px(x, y, [0, 0, 0], 0);
        else px(x, y, jitter([60, 128, 44], rnd, 0.45));
      }
  },
  planks: (px, rnd) => {
    for (let y = 0; y < TILE_PX; y++) {
      const board = Math.floor(y / 4);
      for (let x = 0; x < TILE_PX; x++) {
        const seam = y % 4 === 3 || (x === (board % 2 === 0 ? 4 : 11) && true);
        px(x, y, seam ? [120, 88, 52] : jitter(WOOD, rnd, 0.12));
      }
    }
  },
  glass: (px) => {
    for (let y = 0; y < TILE_PX; y++)
      for (let x = 0; x < TILE_PX; x++) {
        const edge = x === 0 || y === 0 || x === TILE_PX - 1 || y === TILE_PX - 1;
        const glint = (x === y + 3 || x === y + 4) && x > 3 && x < 10;
        if (edge) px(x, y, [200, 230, 240]);
        else if (glint) px(x, y, [235, 250, 255], 0.9);
        else px(x, y, [0, 0, 0], 0);
      }
  },
  cobblestone: (px, rnd) => {
    for (let y = 0; y < TILE_PX; y++)
      for (let x = 0; x < TILE_PX; x++) {
        const cell = (Math.floor(x / 5 + (Math.floor(y / 4) % 2) * 0.5) * 31 + Math.floor(y / 4) * 17) % 7;
        const mortar = y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 2) % 5 === 0;
        px(x, y, mortar ? [80, 80, 80] : jitter([118 + cell * 4, 118 + cell * 4, 118 + cell * 4], rnd, 0.15));
      }
  },
  coal_ore: speckled(STONE, [255, 110, 40], 0.06),
  iron_ore: speckled(STONE, [214, 170, 140], 0.07),
  brick: (px, rnd) => {
    for (let y = 0; y < TILE_PX; y++)
      for (let x = 0; x < TILE_PX; x++) {
        const row = Math.floor(y / 4);
        const mortar = y % 4 === 3 || (x + (row % 2) * 4) % 8 === 7;
        px(x, y, mortar ? [190, 180, 170] : jitter([160, 70, 56], rnd, 0.15));
      }
  },
  snow: noiseFill(SNOW, 0.05),
  snow_side: (px, rnd) => {
    noiseFill(DIRT, 0.25)(px, rnd);
    for (let x = 0; x < TILE_PX; x++) {
      const d = 3 + Math.floor(rnd() * 3);
      for (let y = 0; y < d; y++) px(x, y, jitter(SNOW, rnd, 0.05));
    }
  },
  crystal_ore: speckled(STONE, [110, 230, 255], 0.07),
  gravel: (px, rnd) => {
    for (let y = 0; y < TILE_PX; y++)
      for (let x = 0; x < TILE_PX; x++) {
        const v = 100 + Math.floor(rnd() * 70);
        px(x, y, [v, v - 4, v - 8]);
      }
  },
  bedrock: speckled([60, 60, 60], [20, 20, 20], 0.25),
  wool: noiseFill([236, 236, 236], 0.08),
  lamp: (px, rnd) => {
    for (let y = 0; y < TILE_PX; y++)
      for (let x = 0; x < TILE_PX; x++) {
        const edge = x === 0 || y === 0 || x === TILE_PX - 1 || y === TILE_PX - 1;
        px(x, y, edge ? [120, 90, 60] : jitter([255, 236, 170], rnd, 0.1));
      }
  },
};

export function paintAtlas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * TILE_PX;
  canvas.height = ATLAS_ROWS * TILE_PX;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(canvas.width, canvas.height);
  TILE_NAMES.forEach((name, i) => {
    const ox = (i % ATLAS_COLS) * TILE_PX;
    const oy = Math.floor(i / ATLAS_COLS) * TILE_PX;
    const rnd = mulberry32(1000 + i * 7919);
    PAINTERS[name]((x, y, c, a = 1) => {
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
