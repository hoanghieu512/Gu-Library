import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { IonButton, IonInput, IonLabel } from '@ionic/react';
import { swapHorizontalOutline, printOutline, print, trashOutline } from 'ionicons/icons';
import GuSheet, { SheetActionList } from './GuSheet';

export interface DocTarget { name: string; printFlagged: boolean; }

interface Props {
  isOpen: boolean;
  doc: DocTarget | null;
  onRename: (newName: string) => void;   // rỗng = về tên mặc định (xoá companion)
  onMove: () => void;
  onTogglePrint: () => void;
  onDelete: () => void;
  onClose: () => void;
}

// Sheet thao tác TÀI LIỆU (⋯). B2a: vỏ + danh sách nút dùng chung `GuSheet`/`SheetActionList`;
// ô "Tên hiển thị" đổi sang tông giấy (trước dùng viền `--ion-color-medium` xám-xanh lệch tông).
export default function DocActionsSheet({ isOpen, doc, onRename, onMove, onTogglePrint, onDelete, onClose }: Props) {
  const [name, setName] = useState('');
  useEffect(() => { if (isOpen && doc) setName(doc.name); }, [isOpen, doc]);

  return (
    <GuSheet isOpen={isOpen} title="Tài liệu" onClose={onClose} breakpoint={0.6}>
      {/* Đổi tên hiển thị (để trống = về tên mặc định) */}
      <IonLabel style={{ fontWeight: 600, fontSize: 13, color: 'var(--gu-brown-deep)' }}>Tên hiển thị</IonLabel>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0 16px' }}>
        <IonInput
          value={name} placeholder="Để trống = tên mặc định"
          onIonInput={(e) => setName(String(e.detail.value ?? ''))}
          clearInput
          style={{
            flex: 1, border: '1.5px solid var(--gu-grey)', borderRadius: 10,
            background: 'var(--gu-cream)', '--background': 'transparent',
            '--color': 'var(--gu-brown-deep)',
            '--padding-start': '12px', '--padding-end': '8px',
            '--padding-top': '8px', '--padding-bottom': '8px',
            // Tắt gạch chân/highlight mặc định — viền đã do style trên vẽ (cùng cách NameField).
            '--border-width': '0', '--highlight-height': '0',
          } as CSSProperties}
        />
        <IonButton size="small" shape="round" onClick={() => onRename(name)}>Lưu</IonButton>
      </div>

      <SheetActionList actions={[
        { key: 'move', icon: swapHorizontalOutline, label: 'Chuyển tới…', onClick: onMove },
        {
          key: 'print', icon: doc?.printFlagged ? print : printOutline,
          label: doc?.printFlagged ? 'Bỏ cần in' : 'Đánh dấu cần in', onClick: onTogglePrint,
        },
        { key: 'delete', icon: trashOutline, label: 'Xóa', tone: 'danger', onClick: onDelete },
      ]} />
    </GuSheet>
  );
}
