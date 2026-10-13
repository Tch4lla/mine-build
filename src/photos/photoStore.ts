/** The player's photo library, stored as Blobs in IndexedDB (shared by all worlds). */
import { openDB, type IDBPDatabase } from 'idb';
import { uid } from '../engine/rng';

export interface PhotoRecord {
  id: string;
  name: string;
  blob: Blob;
  w: number;
  h: number;
  createdAt: number;
}

const DB_NAME = 'mine-build-photos';
let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore('photos', { keyPath: 'id' });
    },
  });
  return dbPromise;
}

export async function addPhoto(
  blob: Blob,
  w: number,
  h: number,
  name: string,
  id = uid(),
): Promise<PhotoRecord> {
  const rec: PhotoRecord = { id, name, blob, w, h, createdAt: Date.now() };
  await (await db()).put('photos', rec);
  return rec;
}

export async function getPhoto(id: string): Promise<PhotoRecord | undefined> {
  return (await db()).get('photos', id);
}

export async function listPhotos(): Promise<PhotoRecord[]> {
  const all = (await (await db()).getAll('photos')) as PhotoRecord[];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deletePhoto(id: string): Promise<void> {
  await (await db()).delete('photos', id);
}
