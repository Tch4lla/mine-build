/** Pure helpers for the save format (base64, export bundles). */
import type { SerializedContraption } from '../build/contraptions';
import type { ItemStack } from '../items/inventory';
import type { FrameData, PhotoBlockData } from '../photos/photoEntities';

/** 2: chunks are 16-bit RLE (block id + state); 1: 8-bit block ids. */
export const SAVE_VERSION = 2;

export const EXPORT_FORMAT = 'sozo-world';
/** Exports made before the rename to Sōzō. */
const LEGACY_EXPORT_FORMATS = ['mine-build-world'];

export interface WorldMeta {
  id: string;
  name: string;
  seed: number;
  createdAt: number;
  lastPlayed: number;
  creative: boolean;
  version: number;
  timeOfDay: number;
  player?: { pos: number[]; yaw: number; pitch: number; health: number; flying: boolean; spawn?: number[] };
  inventory?: { slots: (ItemStack | null)[]; selected: number };
  contraptions?: SerializedContraption[];
  frames?: FrameData[];
  photoBlocks?: PhotoBlockData[];
  dummies?: { pos: number[]; yaw: number }[];
  dropped?: { stack: ItemStack; pos: number[] }[];
}

export interface ExportBundle {
  format: string;
  version: number;
  meta: WorldMeta;
  /** chunkKey -> base64(RLE block data): 8-bit before version 2, 16-bit from version 2. */
  chunks: Record<string, string>;
  /** Photos referenced by the world. */
  photos: { id: string; name: string; w: number; h: number; dataUrl: string }[];
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(s);
}

export function base64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Every photo id a world refers to (frames, photo blocks, items in inventory or on the ground). */
export function referencedPhotoIds(meta: WorldMeta): Set<string> {
  const ids = new Set<string>();
  for (const f of meta.frames ?? []) ids.add(f.photoId);
  for (const b of meta.photoBlocks ?? []) ids.add(b.photoId);
  for (const s of meta.inventory?.slots ?? []) if (s?.data?.photoId) ids.add(s.data.photoId);
  for (const d of meta.dropped ?? []) if (d.stack.data?.photoId) ids.add(d.stack.data.photoId);
  return ids;
}

export function validateBundle(x: unknown): ExportBundle {
  const b = x as ExportBundle;
  const known = b && (b.format === EXPORT_FORMAT || LEGACY_EXPORT_FORMATS.includes(b.format));
  if (!known || typeof b.meta !== 'object' || typeof b.chunks !== 'object') {
    throw new Error('This file is not a Sōzō world export.');
  }
  if (b.version > SAVE_VERSION) throw new Error('This world was saved by a newer version of the game.');
  if (!Array.isArray(b.photos)) b.photos = [];
  return b;
}
