import { Preferences } from '@capacitor/preferences';

const KEY = 'reading_progress';

// Monotonic sequence to break ties when Date.now() has ms-level resolution.
let _seq = 0;
function nowMs(): number {
  const t = Date.now();
  // Guarantee strict increase even if called within the same millisecond.
  const v = t * 1000 + (_seq % 1000);
  _seq++;
  return v;
}

export interface Progress {
  docUri: string;
  name: string;
  monName: string;
  page: number;
  total: number;
  lastReadAt: number;
}

type Store = Record<string, Progress>;

async function load(): Promise<Store> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return {};
  try { return JSON.parse(value) as Store; } catch { return {}; }
}
async function save(s: Store): Promise<void> {
  await Preferences.set({ key: KEY, value: JSON.stringify(s) });
}

export async function setProgress(p: Omit<Progress, 'lastReadAt'>): Promise<void> {
  const s = await load();
  s[p.docUri] = { ...p, lastReadAt: nowMs() };
  await save(s);
}

export async function getContinueReading(): Promise<Progress | null> {
  const s = await load();
  const all = Object.values(s);
  if (all.length === 0) return null;
  return all.sort((a, b) => b.lastReadAt - a.lastReadAt)[0];
}

export async function clearProgress(docUri: string): Promise<void> {
  const s = await load();
  delete s[docUri];
  await save(s);
}
