// Suy TÊN MÔN (folder cấp 1 dưới gốc kho) từ SAF tree-URI (gốc) + document-URI (tài liệu).
// SAF externalstorage:
//   rootUri = content://com.android.externalstorage.documents/tree/primary%3ADownload%2Fkho
//   docUri  = .../tree/primary%3ADownload%2Fkho/document/primary%3ADownload%2Fkho%2F<MÔN>%2F...%2Ffile.pdf
// Lấy document-id của doc, bỏ tiền tố = tree-id của gốc, segment đầu còn lại = môn.

function treeId(uri: string): string | null {
  const m = uri.match(/\/tree\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
function documentId(uri: string): string | null {
  const m = uri.match(/\/document\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// Trả tên môn, hoặc '' nếu không suy được (caller dùng fallback).
export function monNameFromUris(rootUri: string, docUri: string): string {
  const root = treeId(rootUri);
  // doc có thể là document-URI (file) hoặc tree-URI (folder con) — thử cả hai.
  const doc = documentId(docUri) ?? treeId(docUri);
  if (!root || !doc) return '';
  if (doc === root) return '';
  const prefix = root.endsWith('/') ? root : root + '/';
  if (!doc.startsWith(prefix)) return '';
  const rel = doc.slice(prefix.length);
  const first = rel.split('/')[0] ?? '';
  return first;
}
