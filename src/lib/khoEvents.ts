// Event nhẹ báo "kho vừa thay đổi" (vd import file vào _inbox) để các màn đang
// hiển thị (Home) refresh ngay, không phải đợi điều hướng lại. Dùng lại được cho
// các thao tác ghi sau này (M9 print outbox...).
const EVENT = 'gulib:kho-changed';

export function emitKhoChanged(): void {
  window.dispatchEvent(new Event(EVENT));
}

export function onKhoChanged(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
