// "Chọn hết / Bỏ chọn hết" trong chế độ chọn-nhiều (Tuyến B — B2c). Thuần, không DOM.
//
// PHẠM VI "HẾT" = đúng tập tài liệu ĐANG HIỂN THỊ ở tầng đang đứng — KHÔNG đệ quy xuống cây con,
// KHÔNG gồm thư mục. Lý do đã cân và chốt: đệ quy sẽ chọn cả tài liệu user không nhìn thấy, rồi
// "Xóa lô" hiện dialog báo N trong khi trên màn chỉ có vài cái — kho của Gú có cây rất sâu nên ca
// sai đó mất dữ liệu THẬT. (Nếu sau này tầng có lọc/sắp xếp thì "hết" vẫn tính theo tập SAU lọc,
// vì `visible` do màn truyền vào chính là thứ đang bày ra.)

// Đã chọn hết CHƯA: mọi mục đang hiển thị đều nằm trong tập chọn. Danh sách rỗng → FALSE (không có
// gì để "hết", nhãn phải giữ "Chọn hết" và nút thì màn tự ẩn).
export function isAllSelected(visible: string[], selected: Set<string>): boolean {
  if (visible.length === 0) return false;
  return visible.every((uri) => selected.has(uri));
}

// Bấm nút: đang chọn hết → BỎ hết (nhưng vẫn ở trong chế độ chọn, màn không tự thoát);
// chưa hết → thêm cho đủ. Chỉ đụng các mục đang hiển thị, không xoá nhầm thứ ngoài tầm.
export function toggleSelectAll(visible: string[], selected: Set<string>): Set<string> {
  const next = new Set(selected);
  if (isAllSelected(visible, selected)) {
    for (const uri of visible) next.delete(uri);
  } else {
    for (const uri of visible) next.add(uri);
  }
  return next;
}

// MỘT nút đổi nhãn theo trạng thái (không phải hai nút cạnh nhau).
export function selectAllLabel(allSelected: boolean): string {
  return allSelected ? 'Bỏ chọn hết' : 'Chọn hết';
}
