import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @capacitor/preferences bằng store trong bộ nhớ.
const mem = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: mem.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => { mem.set(key, value); },
    remove: async ({ key }: { key: string }) => { mem.delete(key); },
  },
}));

import { setProgress, getContinueReading, getProgressFor, clearProgress } from './progress';

beforeEach(() => mem.clear());

describe('reading progress', () => {
  it('returns null when nothing read', async () => {
    expect(await getContinueReading()).toBeNull();
  });
  it('stores and returns the most recent doc', async () => {
    await setProgress({ docUri: 'content://a', name: 'A', monName: 'Môn 1', page: 3, total: 10 });
    const c = await getContinueReading();
    expect(c).toMatchObject({ docUri: 'content://a', page: 3, total: 10, name: 'A' });
  });
  it('continue = the latest updated (by lastReadAt)', async () => {
    await setProgress({ docUri: 'content://a', name: 'A', monName: 'm', page: 1, total: 5 });
    await setProgress({ docUri: 'content://b', name: 'B', monName: 'm', page: 2, total: 5 });
    expect((await getContinueReading())?.docUri).toBe('content://b');
  });
  it('updating same doc keeps one entry, updates page', async () => {
    await setProgress({ docUri: 'content://a', name: 'A', monName: 'm', page: 1, total: 5 });
    await setProgress({ docUri: 'content://a', name: 'A', monName: 'm', page: 4, total: 5 });
    expect((await getContinueReading())?.page).toBe(4);
  });
  it('getProgressFor returns the saved page for a specific doc (restore reading position)', async () => {
    await setProgress({ docUri: 'content://a', name: 'A', monName: 'm', page: 5, total: 10 });
    await setProgress({ docUri: 'content://b', name: 'B', monName: 'm', page: 2, total: 10 });
    expect((await getProgressFor('content://a'))?.page).toBe(5);
    expect(await getProgressFor('content://zzz')).toBeNull();
  });
  it('clearProgress removes it', async () => {
    await setProgress({ docUri: 'content://a', name: 'A', monName: 'm', page: 1, total: 5 });
    await clearProgress('content://a');
    expect(await getContinueReading()).toBeNull();
  });
});
