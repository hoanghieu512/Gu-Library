import { Preferences } from '@capacitor/preferences';

// Cỡ chữ mặc định khi MỞ tài liệu (base-scale). Pinch-zoom là zoom tạm CHỒNG lên base này.
const KEY = 'viewer_base_scale';

export const SCALE_OPTIONS = [
  { label: 'Vừa', value: 1 },     // = fit-width
  { label: 'Lớn', value: 1.5 },
  { label: 'Rất lớn', value: 2 },
];

export async function getBaseScale(): Promise<number> {
  const { value } = await Preferences.get({ key: KEY });
  const n = value ? parseFloat(value) : 1;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export async function setBaseScale(v: number): Promise<void> {
  await Preferences.set({ key: KEY, value: String(v) });
}
