import { colorPaletteOutline, createOutline, trashOutline } from 'ionicons/icons';
import type { Mon } from '../storage/types';
import GuSheet, { SheetActionList } from './GuSheet';

// Sheet thao tác MÔN — bung khi NHẤN GIỮ gáy sách (Home tủ-sách, v1.28.0). B2a: vỏ + danh sách nút
// chuyển sang `GuSheet`/`SheetActionList` dùng chung (trước đây file này và DocActionsSheet chép
// nhau khuôn thẻ-rời). "Chưa phân loại" không tới đây.
export default function MonActionsSheet({ mon, onColor, onRename, onDelete, onClose }: {
  mon: Mon | null; onColor: () => void; onRename: () => void; onDelete: () => void; onClose: () => void;
}) {
  return (
    <GuSheet isOpen={!!mon} title={mon?.name ?? ''} onClose={onClose} breakpoint={0.44}>
      <SheetActionList actions={[
        { key: 'color', icon: colorPaletteOutline, label: 'Đổi màu', onClick: onColor },
        { key: 'rename', icon: createOutline, label: 'Đổi tên', onClick: onRename },
        { key: 'delete', icon: trashOutline, label: 'Xóa', tone: 'danger', onClick: onDelete },
      ]} />
    </GuSheet>
  );
}
