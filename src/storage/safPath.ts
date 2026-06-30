// Đổi SAF tree-URI thành đường dẫn đọc được cho người dùng.
// content://com.android.externalstorage.documents/tree/primary%3ADownload%2Fkho → "Download/kho"
export function readableTreePath(uri: string): string {
  const m = uri.match(/\/tree\/([^/]+)/);
  if (!m) return uri;
  const id = decodeURIComponent(m[1]); // vd "primary:Download/kho"
  const i = id.indexOf(':');
  if (i < 0) return id;
  const rest = id.slice(i + 1);        // bỏ tiền tố volume ("primary:")
  return rest || id;
}
