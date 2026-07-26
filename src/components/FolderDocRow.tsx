import { useRef } from 'react';
import { IonIcon, IonCheckbox } from '@ionic/react';
import { documentTextOutline, print, printOutline, trash, ellipsisHorizontal } from 'ionicons/icons';
import type { Document } from '../storage/types';
import { perfStart } from '../perf/perf';
import KhoRow, { PrintMark, type RowAction } from './KhoRow';

interface Props {
  doc: Document;
  selectMode: boolean;
  selected: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  onLongPress: () => void;
  onTogglePrint: () => void;
  onDelete: () => void;
  onActions: () => void;
}

// Hàng tài liệu: ngoài mode = vuốt (In/Xóa/⋯) + nhấn-giữ vào mode; trong mode = checkbox, tap toggle.
// Beat B1: HÌNH giao cho `KhoRow` (lớp chung), file này chỉ còn giữ CỬ CHỈ + ánh xạ hành động.
export default function FolderDocRow({
  doc, selectMode, selected, onOpen, onToggleSelect, onLongPress,
  onTogglePrint, onDelete, onActions,
}: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = undefined; } };

  // Long-press CHỈ ngoài mode. Huỷ khi ngón di >10px (vuốt/cuộn) hoặc nhấc sớm (tap).
  const onTouchStart = (e: React.TouchEvent) => {
    if (selectMode) return;
    fired.current = false;
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    clear();
    // Đo TỪ khi giữ đủ lâu (không tính 450ms hold) → chỉ đo chi phí chuyển vào mode.
    timer.current = setTimeout(() => { fired.current = true; perfStart('enterSelect'); onLongPress(); }, 450);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!startRef.current) return;
    if (Math.abs(e.touches[0].clientX - startRef.current.x) > 10 ||
        Math.abs(e.touches[0].clientY - startRef.current.y) > 10) clear();
  };

  const handleClick = () => {
    if (fired.current) { fired.current = false; return; } // nuốt click phát sinh sau long-press
    if (selectMode) onToggleSelect(); else onOpen();
  };

  if (selectMode) {
    return (
      <KhoRow
        leading={<IonCheckbox checked={selected} onIonChange={onToggleSelect} aria-label="Chọn" />}
        title={doc.name}
        trailing={doc.printFlagged ? <PrintMark /> : undefined}
        onClick={handleClick}
      />
    );
  }

  const actions: RowAction[] = [
    { key: 'print', icon: doc.printFlagged ? print : printOutline, tone: 'brown', label: 'Cần in', onClick: onTogglePrint },
    { key: 'delete', icon: trash, tone: 'danger', label: 'Xóa', onClick: onDelete },
    { key: 'more', icon: ellipsisHorizontal, tone: 'olive', label: 'Thêm', onClick: onActions },
  ];

  return (
    <KhoRow
      leading={<IonIcon icon={documentTextOutline} style={{ color: 'var(--gu-brown)' }} />}
      title={doc.name}
      trailing={doc.printFlagged ? <PrintMark /> : undefined}
      onClick={handleClick}
      actions={actions}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={clear}
    />
  );
}
