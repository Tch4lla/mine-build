/** Loads photo Blobs into Three.js textures, with caching and thumbnails for the UI. */
import * as THREE from 'three';
import { getPhoto, type PhotoRecord } from './photoStore';
import { setPhotoThumb } from '../items/icons';

interface Entry {
  texture: THREE.Texture;
  /** Square, centre-cropped variant for photo blocks. */
  square: THREE.Texture;
  w: number;
  h: number;
}

const cache = new Map<string, Promise<Entry | null>>();
const thumbUrls = new Map<string, string>();
let maxAnisotropy = 4;

export function setMaxAnisotropy(n: number): void {
  maxAnisotropy = n;
}

export function registerThumb(rec: PhotoRecord): string {
  let url = thumbUrls.get(rec.id);
  if (!url) {
    url = URL.createObjectURL(rec.blob);
    thumbUrls.set(rec.id, url);
    setPhotoThumb(rec.id, url);
  }
  return url;
}

export function forgetPhoto(id: string): void {
  const url = thumbUrls.get(id);
  if (url) URL.revokeObjectURL(url);
  thumbUrls.delete(id);
  const e = cache.get(id);
  cache.delete(id);
  e?.then((entry) => {
    entry?.texture.dispose();
    entry?.square.dispose();
  });
}

async function load(id: string): Promise<Entry | null> {
  const rec = await getPhoto(id);
  if (!rec) return null;
  registerThumb(rec);
  const bitmap = await createImageBitmap(rec.blob, { imageOrientation: 'flipY' });
  const make = () => {
    const t = new THREE.Texture(bitmap);
    t.flipY = false; // already flipped by createImageBitmap
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAnisotropy;
    t.needsUpdate = true;
    return t;
  };
  const texture = make();
  const square = make();
  if (rec.w > rec.h) {
    square.repeat.set(rec.h / rec.w, 1);
    square.offset.set((1 - rec.h / rec.w) / 2, 0);
  } else if (rec.h > rec.w) {
    square.repeat.set(1, rec.w / rec.h);
    square.offset.set(0, (1 - rec.w / rec.h) / 2);
  }
  return { texture, square, w: rec.w, h: rec.h };
}

export function photoTexture(id: string): Promise<Entry | null> {
  let p = cache.get(id);
  if (!p) {
    p = load(id).catch((e) => {
      console.warn('Failed to load photo', id, e);
      return null;
    });
    cache.set(id, p);
  }
  return p;
}
