import { Preferences } from '@capacitor/preferences';

// The Settings switch for the opening doors: no value = on, 'off' = off.
export const OPENING_PREF_KEY = 'opening_doors';

/** Rejects when storage cannot be read: the doors then stay off, as What's New does. */
export async function getOpeningEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: OPENING_PREF_KEY });
  return value !== 'off';
}

export async function setOpeningEnabled(on: boolean): Promise<void> {
  if (on) await Preferences.remove({ key: OPENING_PREF_KEY });
  else await Preferences.set({ key: OPENING_PREF_KEY, value: 'off' });
}
