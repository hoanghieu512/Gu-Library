// Event nhẹ báo "kho vừa thay đổi" (vd import file vào _inbox) để các màn đang
// hiển thị (Home) refresh ngay, không phải đợi điều hướng lại. Dùng lại được cho
// các thao tác ghi sau này (M9 print outbox...).
const EVENT = 'gulib:kho-changed';

let depth = 0;      // độ sâu coalesce đang mở
let pending = false; // có emit bị gom chưa phát

export function emitKhoChanged(): void {
  if (depth > 0) { pending = true; return; } // đang gom → hoãn tới cuối lô
  window.dispatchEvent(new Event(EVENT));
}

export function onKhoChanged(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

// Gom mọi emitKhoChanged phát TRONG fn thành ĐÚNG MỘT phát ở cuối (lô N op → 1 khoChanged
// thay vì N phát pháo reload nền chen nhau). Lồng nhau an toàn (đếm depth). Chỉ phát nếu có
// ít nhất một emit bị gom; lỗi giữa chừng vẫn phát (finally) để phần đã-xong được đối chiếu.
export async function coalesceKhoChanged<T>(fn: () => Promise<T>): Promise<T> {
  depth += 1;
  try {
    return await fn();
  } finally {
    depth -= 1;
    if (depth === 0 && pending) { pending = false; window.dispatchEvent(new Event(EVENT)); }
  }
}
