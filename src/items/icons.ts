/** Inventory icons (data URLs) and 3D item models built from block tiles and pixel sprites. */
import * as THREE from 'three';
import { BLOCKS } from '../world/blocks';
import { ATLAS_COLS, TILE_PX, tileIndex, tileUV } from '../world/tiles';
import { item } from './items';
import type { ItemStack } from './inventory';
import { SPRITE, itemSprite, spriteRGBA, type Sprite } from './pixelArt';

let atlasCanvas: HTMLCanvasElement | null = null;
let atlasTexture: THREE.Texture | null = null;
const iconCache = new Map<string, string>();
/** Photo thumbnails (data/object URLs) keyed by photo id, provided by the photo system. */
const photoThumbs = new Map<string, string>();

export function initIcons(canvas: HTMLCanvasElement, texture: THREE.Texture): void {
  atlasCanvas = canvas;
  atlasTexture = texture;
}

export function setPhotoThumb(photoId: string, url: string): void {
  photoThumbs.set(photoId, url);
}

export function photoThumb(photoId: string | undefined): string | undefined {
  return photoId ? photoThumbs.get(photoId) : undefined;
}

function tileRect(name: string): [number, number] {
  const i = tileIndex(name);
  return [(i % ATLAS_COLS) * TILE_PX, Math.floor(i / ATLAS_COLS) * TILE_PX];
}

function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, scale: number): void {
  for (let i = 0; i < SPRITE * SPRITE; i++) {
    const [r, g, b, a] = spriteRGBA(s, i);
    if (!a) continue;
    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
    ctx.fillRect(x + (i % SPRITE) * scale, y + Math.floor(i / SPRITE) * scale, scale, scale);
  }
}

function blockIcon(blockId: number): string {
  const b = BLOCKS[blockId];
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  if (!atlasCanvas) return c.toDataURL();
  const face = (tile: string, m: [number, number, number, number, number, number], tint: number) => {
    const [sx, sy] = tileRect(tile);
    ctx.save();
    ctx.setTransform(...m);
    ctx.drawImage(atlasCanvas!, sx, sy, TILE_PX, TILE_PX, 0, 0, TILE_PX, TILE_PX);
    ctx.fillStyle = `rgba(0,0,0,${1 - tint})`;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    ctx.restore();
  };
  const s = (1.3 * 16) / TILE_PX;
  // Isometric projection: top, left and right faces.
  face(b.tiles.top, [s, s * 0.5, -s, s * 0.5, 24, 3], 1);
  face(b.tiles.side, [s, s * 0.5, 0, s * 1.1, 3, 13.5], 0.8);
  face(b.tiles.side, [s, -s * 0.5, 0, s * 1.1, 24, 24], 0.62);
  return c.toDataURL();
}

function spriteIcon(id: string, overlay?: string): string {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const ctx = c.getContext('2d')!;
  drawSprite(ctx, itemSprite(id), 0, 0, 3);
  if (overlay) drawSprite(ctx, itemSprite(overlay), 22, 0, 1.6);
  return c.toDataURL();
}

/** Data URL icon for a stack (bound tools get a small material badge). */
export function iconFor(stack: ItemStack | { id: string; data?: ItemStack['data'] }): string {
  const def = item(stack.id);
  const fuse = stack.data?.fuse;
  const key = `${stack.id}|${fuse ?? ''}`;
  let url = iconCache.get(key);
  if (!url) {
    url = def.block !== undefined ? blockIcon(def.block) : spriteIcon(stack.id, fuse);
    iconCache.set(key, url);
  }
  return url;
}

// ---------------------------------------------------------------------------------------------
// 3D models

const spriteGeoCache = new Map<string, THREE.BufferGeometry>();

/** Extrudes a sprite into a thin voxel model, 1 unit wide, centred on the origin. */
export function spriteGeometry(id: string): THREE.BufferGeometry {
  let g = spriteGeoCache.get(id);
  if (g) return g;
  const s = itemSprite(id);
  const pos: number[] = [];
  const col: number[] = [];
  const nor: number[] = [];
  const px = 1 / SPRITE;
  const depth = px;
  const opaque = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < SPRITE && y < SPRITE && (s[y * SPRITE + x] & 255) > 0;
  const quad = (v: number[][], n: number[], c: number[]) => {
    for (const i of [0, 1, 2, 0, 2, 3]) {
      pos.push(...v[i]);
      nor.push(...n);
      col.push(...c);
    }
  };
  for (let y = 0; y < SPRITE; y++)
    for (let x = 0; x < SPRITE; x++) {
      if (!opaque(x, y)) continue;
      const [r, gg, b] = spriteRGBA(s, y * SPRITE + x);
      const c = [r / 255, gg / 255, b / 255].map((v) => Math.pow(v, 2.2));
      const x0 = x * px - 0.5;
      const x1 = x0 + px;
      const y1 = 0.5 - y * px;
      const y0 = y1 - px;
      const z0 = -depth / 2;
      const z1 = depth / 2;
      quad(
        [
          [x0, y0, z1],
          [x1, y0, z1],
          [x1, y1, z1],
          [x0, y1, z1],
        ],
        [0, 0, 1],
        c,
      );
      quad(
        [
          [x1, y0, z0],
          [x0, y0, z0],
          [x0, y1, z0],
          [x1, y1, z0],
        ],
        [0, 0, -1],
        c,
      );
      const dc = c.map((v) => v * 0.7);
      if (!opaque(x - 1, y))
        quad(
          [
            [x0, y0, z0],
            [x0, y0, z1],
            [x0, y1, z1],
            [x0, y1, z0],
          ],
          [-1, 0, 0],
          dc,
        );
      if (!opaque(x + 1, y))
        quad(
          [
            [x1, y0, z1],
            [x1, y0, z0],
            [x1, y1, z0],
            [x1, y1, z1],
          ],
          [1, 0, 0],
          dc,
        );
      if (!opaque(x, y - 1))
        quad(
          [
            [x0, y1, z1],
            [x1, y1, z1],
            [x1, y1, z0],
            [x0, y1, z0],
          ],
          [0, 1, 0],
          dc,
        );
      if (!opaque(x, y + 1))
        quad(
          [
            [x0, y0, z0],
            [x1, y0, z0],
            [x1, y0, z1],
            [x0, y0, z1],
          ],
          [0, -1, 0],
          dc,
        );
    }
  g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  spriteGeoCache.set(id, g);
  return g;
}

const spriteMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

function blockGeometry(blockId: number): THREE.BufferGeometry {
  const b = BLOCKS[blockId];
  const g = new THREE.BoxGeometry(1, 1, 1);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z; 4 vertices each.
  const tiles = [b.tiles.side, b.tiles.side, b.tiles.top, b.tiles.bottom, b.tiles.side, b.tiles.side];
  tiles.forEach((t, f) => {
    const [u0, v0, u1, v1] = tileUV(tileIndex(t));
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      uv.setXY(idx, u0 + (u1 - u0) * uv.getX(idx), v0 + (v1 - v0) * uv.getY(idx));
    }
  });
  return g;
}

/** A 3D model of an item, roughly 1 unit in size, centred on the origin. */
export function itemModel(
  stack: { id: string; data?: ItemStack['data'] },
  photoTexture?: THREE.Texture,
): THREE.Object3D {
  const def = item(stack.id);
  if (def.block !== undefined && atlasTexture) {
    const mat = new THREE.MeshLambertMaterial({ map: atlasTexture, alphaTest: 0.5, transparent: false });
    return new THREE.Mesh(blockGeometry(def.block), mat);
  }
  const group = new THREE.Group();
  group.add(new THREE.Mesh(spriteGeometry(stack.id), spriteMaterial));
  const fuse = stack.data?.fuse;
  if (fuse && def.tool) {
    const [ax, ay] = def.tool.fuseAnchor;
    const m = new THREE.Mesh(spriteGeometry(fuse), spriteMaterial);
    m.scale.setScalar(0.55);
    m.position.set((ax + 0.5) / SPRITE - 0.5, 0.5 - (ay + 0.5) / SPRITE, 0.04);
    group.add(m);
  }
  if (photoTexture && (stack.id === 'shield' || stack.id === 'photo_frame' || stack.id === 'photo_block')) {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshLambertMaterial({ map: photoTexture }),
    );
    plane.position.set(0, stack.id === 'shield' ? 0.06 : 0, 0.04);
    group.add(plane);
  }
  return group;
}
