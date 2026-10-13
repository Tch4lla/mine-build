import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { copyLegacyDb } from '../../src/save/legacy';

describe('legacy storage migration', () => {
  it('copies records from the old database into an empty new one, once', async () => {
    const old = await openDB('legacy-test-old', 1, {
      upgrade(d) {
        d.createObjectStore('worlds', { keyPath: 'id' });
      },
    });
    await old.put('worlds', { id: 'w1', name: 'My old world' });
    old.close();

    const target = await openDB('legacy-test-new', 1, {
      upgrade(d) {
        d.createObjectStore('worlds', { keyPath: 'id' });
      },
    });
    await copyLegacyDb('legacy-test-old', target, ['worlds']);
    expect(await target.get('worlds', 'w1')).toEqual({ id: 'w1', name: 'My old world' });

    // A second run must not overwrite anything the player changed since.
    await target.put('worlds', { id: 'w1', name: 'Renamed' });
    await copyLegacyDb('legacy-test-old', target, ['worlds']);
    expect((await target.get('worlds', 'w1')).name).toBe('Renamed');
  });

  it('does nothing when there is no old database', async () => {
    const target = await openDB('legacy-test-empty', 1, {
      upgrade(d) {
        d.createObjectStore('photos', { keyPath: 'id' });
      },
    });
    await copyLegacyDb('does-not-exist', target, ['photos']);
    expect(await target.count('photos')).toBe(0);
  });
});
