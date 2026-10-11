import { Preferences } from '@capacitor/preferences';

// The version whose notes Pé has seen (closed the sheet for). Absent = never seen any (v1.42.0).
const KEY = 'whats_new_seen';

export async function getSeenVersion(): Promise<string | null> {
  const { value } = await Preferences.get({ key: KEY });
  return value ?? null;
}

export async function setSeenVersion(version: string): Promise<void> {
  await Preferences.set({ key: KEY, value: version });
}
