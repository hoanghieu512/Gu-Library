import type { MonMeta } from './types';

export function parseMonMeta(text: string): MonMeta {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {};
  }
  if (typeof raw !== 'object' || raw === null) return {};
  const obj = raw as Record<string, unknown>;
  const meta: MonMeta = {};
  if (typeof obj.color === 'string') meta.color = obj.color;
  if (typeof obj.order === 'number') meta.order = obj.order;
  if (typeof obj.icon === 'string') meta.icon = obj.icon;
  return meta;
}
