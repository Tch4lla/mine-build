/** IndexedDB persistence: world metadata + only the chunks the player changed (RLE compressed). */
import { openDB, type IDBPDatabase } from 'idb';
import { rleDecode, rleDecodeV1, rleEncode } from '../world/chunk';
import { uid } from '../engine/rng';
import { addPhoto, getPhoto } from '../photos/photoStore';
import {
  EXPORT_FORMAT,
  SAVE_VERSION,
  base64ToBytes,
  bytesToBase64,
  referencedPhotoIds,
  validateBundle,
  type ExportBundle,
  type WorldMeta,
} from './serialize';
import { copyLegacyDb } from './legacy';
import { GAME_SLUG } from '../brand';

const DB_NAME = GAME_SLUG;
const LEGACY_DB_NAME = 'mine-build';
let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore('worlds', { keyPath: 'id' });
      const chunks = d.createObjectStore('chunks', { keyPath: 'k' });
      chunks.createIndex('world', 'world');
    },
  }).then(async (d) => {
    await copyLegacyDb(LEGACY_DB_NAME, d, ['worlds', 'chunks']);
    return d;
  });
  return dbPromise;
}

interface ChunkRow {
  k: string; // `${worldId}|${chunkKey}`
  world: string;
  key: string;
  rle: Uint8Array;
  /** Chunk encoding: absent in saves before version 2 (8-bit RLE), 2 for 16-bit RLE. */
  v?: number;
}

/** Decodes chunk RLE written by any save version. */
function decodeChunk(rle: Uint8Array, version: number | undefined): Uint16Array {
  return (version ?? 1) >= 2 ? rleDecode(rle) : rleDecodeV1(rle);
}

export async function listWorlds(): Promise<WorldMeta[]> {
  const all = (await (await db()).getAll('worlds')) as WorldMeta[];
  return all.sort((a, b) => b.lastPlayed - a.lastPlayed);
}

export async function createWorld(name: string, seed: number, creative: boolean): Promise<WorldMeta> {
  const meta: WorldMeta = {
    id: uid(),
    name: name.trim() || 'New World',
    seed,
    creative,
    createdAt: Date.now(),
    lastPlayed: Date.now(),
    version: SAVE_VERSION,
    timeOfDay: 0.3,
  };
  await (await db()).put('worlds', meta);
  return meta;
}

export async function loadWorld(
  id: string,
): Promise<{ meta: WorldMeta; chunks: Map<string, Uint16Array> } | null> {
  const d = await db();
  const meta = (await d.get('worlds', id)) as WorldMeta | undefined;
  if (!meta) return null;
  const rows = (await d.getAllFromIndex('chunks', 'world', id)) as ChunkRow[];
  const chunks = new Map<string, Uint16Array>();
  for (const r of rows) chunks.set(r.key, decodeChunk(r.rle, r.v));
  return { meta, chunks };
}

export async function saveWorld(meta: WorldMeta, changedChunks: Map<string, Uint16Array>): Promise<void> {
  const d = await db();
  const tx = d.transaction(['worlds', 'chunks'], 'readwrite');
  meta.lastPlayed = Date.now();
  meta.version = SAVE_VERSION;
  await tx.objectStore('worlds').put(meta);
  const store = tx.objectStore('chunks');
  for (const [key, blocks] of changedChunks) {
    const row: ChunkRow = { k: `${meta.id}|${key}`, world: meta.id, key, rle: rleEncode(blocks), v: 2 };
    await store.put(row);
  }
  await tx.done;
}

export async function deleteWorld(id: string): Promise<void> {
  const d = await db();
  const tx = d.transaction(['worlds', 'chunks'], 'readwrite');
  await tx.objectStore('worlds').delete(id);
  const idx = tx.objectStore('chunks').index('world');
  for (let cur = await idx.openCursor(id); cur; cur = await cur.continue()) await cur.delete();
  await tx.done;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

/** Builds a single JSON file containing the world and every photo it uses. */
export async function exportWorld(id: string): Promise<string> {
  const loaded = await loadWorld(id);
  if (!loaded) throw new Error('World not found');
  const chunks: Record<string, string> = {};
  for (const [k, v] of loaded.chunks) chunks[k] = bytesToBase64(rleEncode(v));
  const photos: ExportBundle['photos'] = [];
  for (const pid of referencedPhotoIds(loaded.meta)) {
    const p = await getPhoto(pid);
    if (p) photos.push({ id: p.id, name: p.name, w: p.w, h: p.h, dataUrl: await blobToDataUrl(p.blob) });
  }
  const bundle: ExportBundle = {
    format: EXPORT_FORMAT,
    version: SAVE_VERSION,
    meta: loaded.meta,
    chunks,
    photos,
  };
  return JSON.stringify(bundle);
}

/** Imports an exported world as a new world (photos are added to the library). */
export async function importWorld(json: string): Promise<WorldMeta> {
  const bundle = validateBundle(JSON.parse(json));
  for (const p of bundle.photos) {
    if (!(await getPhoto(p.id))) await addPhoto(await dataUrlToBlob(p.dataUrl), p.w, p.h, p.name, p.id);
  }
  const meta: WorldMeta = {
    ...bundle.meta,
    id: uid(),
    name: `${bundle.meta.name} (imported)`,
    lastPlayed: Date.now(),
  };
  const chunks = new Map<string, Uint16Array>();
  for (const [k, b64] of Object.entries(bundle.chunks))
    chunks.set(k, decodeChunk(base64ToBytes(b64), bundle.version));
  await saveWorld(meta, chunks);
  return meta;
}
