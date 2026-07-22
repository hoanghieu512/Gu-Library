import { Capacitor } from '@capacitor/core';
import { Saf } from '../plugins/saf';

// Đọc một file (PDF) trong kho -> bytes cho pdf.js.
//
// v1.26.0 — ĐỔI READ-PATH (trả nợ OOM v1.4.1): trước đây `Saf.readFileBase64` đọc cả file rồi
// `Base64.encodeToString` dựng một String base64 KHỔNG LỒ (UTF-16, ~2× kích thước base64) trên
// Dalvik/Java heap (cap ~256MB). File luật ~64MB → cần alloc ~170MB String → OutOfMemoryError
// TRƯỚC cả khi render (spike split-screen xác nhận đây là trần cứng, cả single-viewer).
//
// Nay đọc qua LOCAL-SERVER của Capacitor: `convertFileSrc` map content:// → URL
// `/_capacitor_content_/…`; `fetch` → WebViewLocalServer STREAM InputStream của content-URI
// (8KB/lần, KHÔNG dựng String, KHÔNG buffer cả file ở native) → `arrayBuffer()` materialize
// file thành ArrayBuffer trong RENDERER (Chromium, không dính cap 256MB của Dalvik). Không base64.
//
// Luồng lỗi giữ NGUYÊN: fetch thất bại (quyền SAF thu hồi / file bị move-xóa) → throw → ViewerPage
// catch → empty-state "chết cho đẹp". Lưới OOM renderer (onRenderProcessGone → recreate) vẫn còn.
export async function readPdfBytes(uri: string): Promise<Uint8Array> {
  // Probe TRƯỚC (native try/catch): file move/xóa (FileNotFound) hoặc quyền SAF thu hồi (SecurityException)
  // → reject → throw ở đây → ViewerPage catch → panda. BẮT BUỘC: nếu để fetch chạm file gone, local-server
  // Capacitor ném lỗi KHÔNG bắt trong shouldInterceptRequest → CRASH cả app (main-process, đo thật trên Flip4).
  await Saf.probeReadable({ uri });
  const url = Capacitor.convertFileSrc(uri);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`đọc file thất bại: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  // Guard rỗng: quyền SAF thu hồi → local-server trả stream null → phản hồi 200 body RỖNG (không
  // throw). Không chặn thì pdf.js nhận 0 byte → trang trắng im lặng thay vì "chết cho đẹp". Ném để
  // ViewerPage catch → empty-state panda. (File move/xóa thường đã ném ở tầng fetch — đây là lưới phụ.)
  if (buf.byteLength === 0) throw new Error('đọc file thất bại: nội dung rỗng');
  return new Uint8Array(buf);
}
