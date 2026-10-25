import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import { prefs } from '../test/fakePreferences';
import { getOpeningEnabled, setOpeningEnabled, OPENING_PREF_KEY } from './openingPref';

vi.mock('@capacitor/preferences', () => import('../test/fakePreferences'));

beforeEach(() => prefs.clear());
afterEach(() => vi.restoreAllMocks());

describe('openingPref', () => {
  it('is on when nothing is stored', async () => {
    expect(await getOpeningEnabled()).toBe(true);
  });

  it('turning it off stores "off" under opening_doors', async () => {
    await setOpeningEnabled(false);
    expect(OPENING_PREF_KEY).toBe('opening_doors');
    expect(prefs.get('opening_doors')).toBe('off');
    expect(await getOpeningEnabled()).toBe(false);
  });

  it('turning it back on removes the key', async () => {
    prefs.set('opening_doors', 'off');
    await setOpeningEnabled(true);
    expect(prefs.has('opening_doors')).toBe(false);
    expect(await getOpeningEnabled()).toBe(true);
  });

  it('a failed read rejects instead of guessing', async () => {
    vi.spyOn(Preferences, 'get').mockRejectedValueOnce(new Error('storage gone'));
    await expect(getOpeningEnabled()).rejects.toThrow('storage gone');
  });
});
