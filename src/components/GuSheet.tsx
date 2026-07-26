import type { CSSProperties, ReactNode } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonItem, IonLabel, IonIcon,
} from '@ionic/react';

// VỎ SHEET/MODAL dùng chung (Tuyến B — Beat B2a). Mọi sheet + modal của app đi qua đây:
// ⋯ tài liệu · ⋯ môn · đổi màu · đổi tên · (B3: chọn môn–thư mục, Sync).
// Vỏ CHỈ lo khung: header (tên + nút đóng + chỗ cắm nút trái) và vùng nội dung ĐÚNG LỀ.
//
// LỀ: `className="ion-padding"` VÔ HIỆU trên IonContent (bài học v1.10.0, tái xuất v1.29.0) →
// vỏ này luôn set qua biến `--padding-*`, các màn khỏi tự nhớ.

export type SheetTone = 'brown' | 'danger';

// Hành động trong sheet — song song với `RowAction[]` của KhoRow (B1): danh sách do MÀN truyền
// vào, vỏ không biết gì về nghiệp vụ. B3 cắm thêm hành động mới mà không phải sửa vỏ.
export interface SheetAction {
  key: string;
  icon: string;
  label: string;
  tone?: SheetTone;   // mặc định 'brown'; 'danger' = chữ + icon đỏ đất (Xóa)
  onClick: () => void;
  disabled?: boolean;
}

const card: CSSProperties = {
  '--background': 'var(--gu-paper-2)', '--border-radius': '14px',
  '--padding-top': '12px', '--padding-bottom': '12px',
} as CSSProperties;

// Danh sách nút thẻ-rời trong sheet (thay 2 bản sao chép ở DocActionsSheet + MonActionsSheet).
export function SheetActionList({ actions }: { actions: SheetAction[] }) {
  return (
    <>
      {actions.map((a) => {
        const danger = a.tone === 'danger';
        const color = danger ? 'var(--ion-color-danger)' : 'var(--gu-brown)';
        return (
          <div key={a.key} style={{ marginBottom: 10 }}>
            <IonItem button detail={false} lines="none" disabled={a.disabled} onClick={a.onClick} style={card}>
              <IonIcon icon={a.icon} style={{ color, marginRight: 12 }} />
              <IonLabel className={danger ? undefined : 'gu-serif'} style={danger ? { color } : undefined}>
                {a.label}
              </IonLabel>
            </IonItem>
          </div>
        );
      })}
    </>
  );
}

export interface GuSheetProps {
  isOpen: boolean;
  title: ReactNode;
  onClose: () => void;
  closeLabel?: string;        // "Đóng" (sheet thao tác) | "Huỷ" (sheet nhập liệu)
  closeDisabled?: boolean;
  startSlot?: ReactNode;      // nút trái header — vd mũi tên back khi drill (B3 chọn môn–thư mục)
  // 'sheet' = trượt từ đáy theo breakpoint; 'full' = modal đầy màn (Đổi tên — GIỮ dạng modal,
  // KHÔNG dựng màn riêng dù prototype vẽ vậy: Reconcile Map xếp 9e vào nhóm reuse-chỉ-reskin).
  variant?: 'sheet' | 'full';
  breakpoint?: number;        // chỉ dùng khi variant='sheet'
  children: ReactNode;
}

export default function GuSheet({
  isOpen, title, onClose, closeLabel = 'Đóng', closeDisabled, startSlot,
  variant = 'sheet', breakpoint = 0.6, children,
}: GuSheetProps) {
  const sheetProps = variant === 'sheet'
    ? { breakpoints: [0, breakpoint], initialBreakpoint: breakpoint, expandToScroll: false }
    : {};
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} {...sheetProps}>
      <IonHeader>
        <IonToolbar>
          {startSlot && <IonButtons slot="start">{startSlot}</IonButtons>}
          <IonTitle className="gu-title" style={{ fontSize: 17 }}>{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={onClose} disabled={closeDisabled}>{closeLabel}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{
        '--padding-start': '16px', '--padding-end': '16px',
        '--padding-top': '16px', '--padding-bottom': '16px',
      } as CSSProperties}>
        {children}
      </IonContent>
    </IonModal>
  );
}
