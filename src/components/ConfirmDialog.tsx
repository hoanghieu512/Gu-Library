import GuDialog from './GuDialog';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;    // mặc định "Xóa"
  singleAction?: boolean;  // true = chỉ 1 nút (dùng cho thông báo chặn, không có Hủy)
  onConfirm: () => void;
  onCancel: () => void;
}

// Dialog xác nhận (chống lỡ tay) — B2a: phần VỎ chuyển sang `GuDialog` dùng chung, file này giữ
// nguyên interface để mọi chỗ gọi (xóa tài liệu lẻ / xóa lô / xóa thư mục / thông báo chặn) không
// phải sửa. Nội dung (tiêu đề động, đếm đệ quy, câu KHÔNG dọa "không hoàn tác") do bên gọi truyền.
export default function ConfirmDialog(props: Props) {
  return <GuDialog {...props} tone="danger" />;
}
