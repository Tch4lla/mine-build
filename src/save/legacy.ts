/**
 * One-time migration from the game's previous storage names ("mine-build"), so players keep
 * their worlds, photos and settings after the rename. Old databases are left in place.
 */
import { openDB, type IDBPDatabase } from 'idb';

async function legacyExists(name: string): Promise<boolean> {
  // indexedDB.databases() is the only way to check without accidentally creating the DB.
  if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') return false;
  try {
    return (await indexedDB.databases()).some((d) => d.name === name);
  } catch {
    return false;
  }
}

/** Copies every record of `stores` from `legacyName` into `target` if the target stores are empty. */
export async function copyLegacyDb(
  legacyName: string,
  target: IDBPDatabase,
  stores: string[],
): Promise<void> {
  try {
    const empty = await Promise.all(stores.map(async (s) => (await target.count(s)) === 0));
    if (!empty.every(Boolean) || !(await legacyExists(legacyName))) return;
    const old = await openDB(legacyName);
    try {
      for (const s of stores) {
        if (!old.objectStoreNames.contains(s)) continue;
        const rows = await old.getAll(s);
        const tx = target.transaction(s, 'readwrite');
        for (const r of rows) void tx.store.put(r);
        await tx.done;
      }
    } finally {
      old.close();
    }
  } catch (e) {
    console.warn(`Could not migrate ${legacyName}`, e);
  }
}

/** Moves a localStorage value from an old key to a new one. */
export function migrateLocalStorageKey(oldKey: string, newKey: string): void {
  try {
    if (localStorage.getItem(newKey) === null) {
      const v = localStorage.getItem(oldKey);
      if (v !== null) localStorage.setItem(newKey, v);
    }
  } catch {
    /* storage unavailable */
  }
}
