// Dựng index cho MỘT tài liệu — phục vụ "tìm trong tài liệu này" ở Viewer.
//
// KHÔNG dùng chung chỉ mục toàn kho: chỉ mục đó nặng ~130 MB heap và chỉ nạp ở màn Tìm. Đọc lại
// một sidecar (~50 ms) rồi tách từ đúng nó (~30 ms) rẻ hơn nhiều, và Viewer không phải gánh
// bộ nhớ của cả kho chỉ để tra một quyển. Tái dùng nguyên `indexDoc` + `search` của v1.38.0.

import { Saf } from '../plugins/saf';
import { getKhoSnapshot } from '../storage/khoSnapshot';
import type { KhoFolder } from '../storage/khoSnapshot';
import { indexDoc, mergeShards } from './invertedIndex';
import type { SearchIndex, Sidecar } from './invertedIndex';

export interface DocIndex {
  index: SearchIndex;
  /** Tài liệu là ảnh scan chưa OCR → tra gì cũng không ra, phải nói cho người dùng biết. */
  imageOnly: boolean;
}

/** Tìm cặp pdf+json của một tài liệu trong cây kho đang cache. */
function findDoc(f: KhoFolder, pdfUri: string, mon: string):
{ jsonUri: string; name: string; mon: string } | null {
  for (const d of f.listing.documents) {
    if (d.pdfUri === pdfUri) return { jsonUri: d.jsonUri, name: d.fileBase ?? d.name, mon };
  }
  for (const c of f.children) {
    const hit = findDoc(c, pdfUri, mon);
    if (hit) return hit;
  }
  return null;
}

/**
 * `null` = không tra được (không thấy sidecar, hoặc sidecar hỏng) — khác hẳn ca "tra được nhưng
 * tài liệu là ảnh", nên phải phân biệt ở chỗ hiển thị.
 */
export async function indexOneDoc(pdfUri: string): Promise<DocIndex | null> {
  const snap = await getKhoSnapshot();          // đã cache trong phiên → thường không tốn vòng SAF
  let found: { jsonUri: string; name: string; mon: string } | null = null;
  for (const m of snap.mons) {
    const f = snap.monFolders.get(m.uri);
    if (!f) continue;
    found = findDoc(f, pdfUri, m.name);
    if (found) break;
  }
  if (!found) return null;

  try {
    const raw = (await Saf.readFile({ uri: found.jsonUri })).data;
    const sc = JSON.parse(raw) as Sidecar;
    const shard = indexDoc({ pdfUri, name: found.name, mon: found.mon }, sc);
    return { index: mergeShards([shard]), imageOnly: shard.imageOnly };
  } catch {
    return null;                                // sidecar mất/hỏng → "chết cho đẹp" ở chỗ gọi
  }
}
