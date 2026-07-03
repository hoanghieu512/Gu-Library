// Tên hiển thị người dùng đặt (override): companion <base>.display.json {name} cạnh cặp.
// Ưu tiên hiển thị: .display.json > tên file (CHỐT v1.5.0: KHÔNG đọc sidecar title).
export const DISPLAY_SUFFIX = '.display.json';

export function displayFileName(base: string): string {
  return `${base}${DISPLAY_SUFFIX}`;
}

export function isDisplayFile(name: string): boolean {
  return name.endsWith(DISPLAY_SUFFIX);
}

export function parseDisplayName(json: string): string | null {
  try {
    const v = JSON.parse(json) as { name?: unknown };
    const n = typeof v.name === 'string' ? v.name.trim() : '';
    return n || null;
  } catch {
    return null;
  }
}
