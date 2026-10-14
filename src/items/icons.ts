/**
 * Inventory icons (SVG data URLs) and 3D item models.
 *
 * Items are vector ink drawings (see inkArt.ts): the icon is the drawing with an ink stroke, and
 * the 3D model is the same drawing extruded into thin layered slabs. Blocks use an isometric cube
 * built from their atlas tiles, outlined in ink.
 */
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { BLOCKS, blockLibId } from '../world/blocks';
import { ChunkData } from '../world/chunk';
import { meshChunk } from '../world/chunkMesher';
import { libArt, libSvg } from '../library/art';
import { ATLAS_COLS, TILE_PX, tileIndex, tileUV } from '../world/tiles';
import { toonGradient } from '../engine/atlas';
import { item } from './items';
import type { ItemStack } from './inventory';
import { C, itemSvg, svgDataUrl } from './inkArt';

let atlasCanvas: HTMLCanvasElement | null = null;
let atlasTexture: THREE.Texture | null = null;
const iconCache = new Map<string, string>();
const tileUrls = new Map<string, string>();
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

/** One atlas tile as a PNG data URL (embedded in block icons). */
function tileUrl(name: string): string {
  let url = tileUrls.get(name);
  if (url) return url;
  const c = document.createElement('canvas');
  c.width = c.height = TILE_PX;
  if (atlasCanvas) {
    const i = tileIndex(name);
    const sx = (i % ATLAS_COLS) * TILE_PX;
    const sy = Math.floor(i / ATLAS_COLS) * TILE_PX;
    c.getContext('2d')!.drawImage(atlasCanvas, sx, sy, TILE_PX, TILE_PX, 0, 0, TILE_PX, TILE_PX);
  }
  url = c.toDataURL();
  tileUrls.set(name, url);
  return url;
}

/** An isometric cube: three tile faces, toon-shaded, with ink edges. */
function blockIcon(blockId: number): string {
  const b = BLOCKS[blockId];
  // Each face maps the unit square onto a parallelogram (SVG matrix a b c d e f).
  const face = (tile: string, m: number[], shade: number) =>
    `<image href="${tileUrl(tile)}" width="1" height="1" preserveAspectRatio="none" transform="matrix(${m.join(' ')})"/>` +
    (shade
      ? `<polygon fill="${C.ink}" fill-opacity="${shade}" points="${[
          [m[4], m[5]],
          [m[4] + m[0], m[5] + m[1]],
          [m[4] + m[0] + m[2], m[5] + m[1] + m[3]],
          [m[4] + m[2], m[5] + m[3]],
        ].join(' ')}"/>`
      : '');
  const body =
    face(b.tiles.top, [40, -20, 40, 20, 10, 26], 0) +
    face(b.tiles.side, [40, 20, 0, 48, 10, 26], 0.14) +
    face(b.tiles.side, [40, -20, 0, 48, 50, 46], 0.3);
  const lines =
    `<g fill="none" stroke="${C.ink}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round">` +
    `<polygon points="50,6 90,26 90,74 50,94 10,74 10,26"/>` +
    `<polyline points="10,26 50,46 90,26"/><line x1="50" y1="46" x2="50" y2="94"/></g>`;
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 112 112">${body}${lines}</svg>`);
}

/** Forget cached icons and block models (after the block art changes). */
export function clearIconCache(): void {
  iconCache.clear();
  blockModels.clear();
}

/** A block's icon: its sprite-library drawing when it has one, else an isometric cube. */
function blockIconFor(blockId: number): string {
  const libId = blockLibId(BLOCKS[blockId]);
  const art = libId ? libArt('block', libId) : undefined;
  return art ? svgDataUrl(libSvg(art)) : blockIcon(blockId);
}

/** Data URL icon for a stack (bound tools show their material at the binding point). */
export function iconFor(stack: ItemStack | { id: string; data?: ItemStack['data'] }): string {
  const def = item(stack.id);
  const fuse = stack.data?.fuse;
  const key = `${stack.id}|${fuse ?? ''}`;
  let url = iconCache.get(key);
  if (!url) {
    url =
      def.block !== undefined && !def.tool
        ? blockIconFor(def.block)
        : svgDataUrl(itemSvg(stack.id, { fuse, stroke: true }));
    iconCache.set(key, url);
  }
  return url;
}

// ---------------------------------------------------------------------------------------------
// 3D models

interface Layer {
  geometry: THREE.BufferGeometry;
  color: THREE.Color;
}

const DEPTH = 0.05;
/** Each later shape is a little thicker, so it sits on top of earlier ones from both sides. */
const LAYER_STEP = 0.004;
const layerCache = new Map<string, Layer[]>();
const toonMaterials = new Map<number, THREE.MeshToonMaterial>();
const svgLoader = new SVGLoader();

function toonMaterial(color: THREE.Color): THREE.MeshToonMaterial {
  const key = color.getHex();
  let m = toonMaterials.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() });
    toonMaterials.set(key, m);
  }
  return m;
}

/** The item's drawing as extruded layers, 1 unit wide, centred on the origin. */
export function itemLayers(id: string, fuse?: string): Layer[] {
  const key = `${id}|${fuse ?? ''}`;
  let layers = layerCache.get(key);
  if (layers) return layers;
  layers = [];
  const data = svgLoader.parse(itemSvg(id, { fuse }));
  let i = 0;
  for (const path of data.paths) {
    const fill = (path.userData?.style as { fill?: string } | undefined)?.fill;
    if (fill === 'none') continue;
    for (const shape of path.toShapes()) {
      const depth = DEPTH + i * LAYER_STEP * 2;
      const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 });
      // SVG y points down and the box is 0–100: flip and centre it. Flipping z as well keeps
      // the triangle winding (and so the normals) facing outwards.
      g.translate(-50, -50, -depth / 2);
      g.scale(0.01, -0.01, -1);
      layers.push({ geometry: g, color: path.color.clone() });
      i++;
    }
  }
  layerCache.set(key, layers);
  return layers;
}

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

/**
 * A shaped block (slab, stairs, fence, plant...) as the chunk mesher draws it, centred on the
 * origin, so held and dropped blocks look like placed ones.
 */
const blockModels = new Map<number, THREE.BufferGeometry>();
function shapedBlockGeometry(blockId: number): THREE.BufferGeometry {
  let g = blockModels.get(blockId);
  if (g) return g;
  const c = new ChunkData(0, 0);
  c.set(1, 1, 1, blockId);
  const m = meshChunk(c, () => 0).solid;
  g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(m.uvs, 2));
  g.setAttribute('color', new THREE.BufferAttribute(m.colors, 3));
  g.setIndex(new THREE.BufferAttribute(m.indices, 1));
  g.translate(-1.5, -1.5, -1.5);
  blockModels.set(blockId, g);
  return g;
}

/** A 3D model of an item, roughly 1 unit in size, centred on the origin. */
export function itemModel(
  stack: { id: string; data?: ItemStack['data'] },
  photoTexture?: THREE.Texture,
): THREE.Object3D {
  const def = item(stack.id);
  if (def.block !== undefined && !def.tool && atlasTexture) {
    const shaped = (BLOCKS[def.block].shape ?? 'cube') !== 'cube';
    const mat = new THREE.MeshToonMaterial({
      map: atlasTexture,
      alphaTest: 0.5,
      gradientMap: toonGradient(),
      vertexColors: shaped,
      side: shaped ? THREE.DoubleSide : THREE.FrontSide,
    });
    return new THREE.Mesh(shaped ? shapedBlockGeometry(def.block) : blockGeometry(def.block), mat);
  }
  const group = new THREE.Group();
  const layers = itemLayers(stack.id, def.tool ? stack.data?.fuse : undefined);
  for (const l of layers) group.add(new THREE.Mesh(l.geometry, toonMaterial(l.color)));
  if (photoTexture && (stack.id === 'shield' || stack.id === 'photo_frame' || stack.id === 'photo_block')) {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshToonMaterial({ map: photoTexture, gradientMap: toonGradient() }),
    );
    const front = DEPTH / 2 + layers.length * LAYER_STEP + 0.005;
    plane.position.set(0, stack.id === 'shield' ? -0.05 : 0, front);
    group.add(plane);
  }
  return group;
}
