export interface ReadingEntry {
  path: string; name: string; monName: string; page: number; total: number; lastReadAt: number;
}
export interface DeviceReadingFile {
  deviceId: string;
  entries: Record<string, ReadingEntry>;
  tombstones: Record<string, number>;
}

// Union mọi file device → danh sách entry hiển thị (sort lastReadAt giảm dần).
// Mỗi path: action mới nhất thắng (đọc vs xoá). KHÔNG lọc tồn tại file (việc của repo).
export function mergeReading(files: DeviceReadingFile[]): ReadingEntry[] {
  const bestEntry = new Map<string, ReadingEntry>();
  const bestTomb = new Map<string, number>();
  for (const f of files) {
    for (const e of Object.values(f.entries ?? {})) {
      const cur = bestEntry.get(e.path);
      if (!cur || e.lastReadAt > cur.lastReadAt) bestEntry.set(e.path, e);
    }
    for (const [p, t] of Object.entries(f.tombstones ?? {})) {
      const cur = bestTomb.get(p);
      if (cur === undefined || t > cur) bestTomb.set(p, t);
    }
  }
  const out: ReadingEntry[] = [];
  for (const [path, e] of bestEntry) {
    const tomb = bestTomb.get(path);
    if (tomb !== undefined && tomb >= e.lastReadAt) continue; // đã xoá sau lần đọc
    out.push(e);
  }
  return out.sort((a, b) => b.lastReadAt - a.lastReadAt);
}

// upsert/remove thuần trên 1 file device (repo lo IO + nowMs).
export function upsertEntry(file: DeviceReadingFile, e: ReadingEntry): DeviceReadingFile {
  const entries = { ...file.entries, [e.path]: e };
  const tombstones = { ...file.tombstones };
  delete tombstones[e.path]; // đọc lại → bỏ tombstone
  return { ...file, entries, tombstones };
}
export function removeEntry(file: DeviceReadingFile, path: string, at: number): DeviceReadingFile {
  const entries = { ...file.entries };
  delete entries[path];
  return { ...file, entries, tombstones: { ...file.tombstones, [path]: at } };
}
