import type { FolderListing } from './types';
import { getKhoSnapshot, foldSummary } from './khoSnapshot';

export type FolderLister = (uri: string) => Promise<FolderListing>;

export interface MonSummary { documents: number; pending: number; }

// Đếm đệ quy số tài liệu (cặp pdf+json) + số chờ xử lý trong cả cây của một môn.
// Nhận lister để test được không cần SAF; mặc định dùng repo.listFolder.
export async function accumulate(uri: string, lister: FolderLister): Promise<MonSummary> {
  const listing = await lister(uri);
  let documents = listing.documents.length;
  let pending = listing.pending.length;
  for (const f of listing.folders) {
    const sub = await accumulate(f.uri, lister);
    documents += sub.documents;
    pending += sub.pending;
  }
  return { documents, pending };
}

// Tóm tắt số tài liệu/chờ của một môn = fold cây con trong walk chung (không tự walk lại).
export async function summarizeMon(uri: string): Promise<MonSummary> {
  const snap = await getKhoSnapshot();
  const f = snap.byUri.get(uri) ?? snap.monFolders.get(uri);
  return f ? foldSummary(f) : { documents: 0, pending: 0 };
}
