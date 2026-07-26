import type { CSSProperties, ReactNode } from 'react';
import { IonModal, IonButton, IonIcon } from '@ionic/react';
import { alertCircle } from 'ionicons/icons';

// VỎ DIALOG nhỏ giữa màn (Tuyến B — Beat B2a): huy hiệu icon tròn + tiêu đề + mô tả + hàng nút.
// Tách từ ConfirmDialog để B3 (modal Sync) cắm lại được mà không phải dựng vỏ thứ hai.
// Backdrop/back = onCancel (an toàn: đóng = KHÔNG làm gì).

export type DialogTone = 'danger' | 'brown';

const TONE: Record<DialogTone, { fg: string; bg: string }> = {
  danger: { fg: 'var(--ion-color-danger)', bg: 'rgba(161,64,44,0.12)' },   // đỏ đất trên nền đỏ nhạt
  brown: { fg: 'var(--gu-brown)', bg: 'rgba(117,66,14,0.12)' },
};

export interface GuDialogProps {
  isOpen: boolean;
  title: ReactNode;
  message: ReactNode;
  icon?: string;
  tone?: DialogTone;
  confirmText?: string;
  cancelText?: string;
  singleAction?: boolean;   // true = chỉ 1 nút (thông báo chặn, không có Hủy)
  onConfirm: () => void;
  onCancel: () => void;
}

export default function GuDialog({
  isOpen, title, message, icon = alertCircle, tone = 'danger',
  confirmText = 'Xóa', cancelText = 'Hủy', singleAction = false, onConfirm, onCancel,
}: GuDialogProps) {
  const t = TONE[tone];
  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onCancel}
      style={{ '--width': '300px', '--height': 'auto', '--border-radius': '18px', '--background': 'var(--gu-paper-2)' } as CSSProperties}
    >
      <div style={{ padding: 26, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: t.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
        }}>
          <IonIcon icon={icon} style={{ fontSize: 32, color: t.fg }} />
        </div>
        <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 18, color: 'var(--gu-brown-deep)' }}>
          {title}
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--gu-grey)', margin: '8px 0 20px', lineHeight: 1.5 }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!singleAction && (
            <IonButton
              fill="outline" onClick={onCancel}
              style={{ flex: 1, textTransform: 'none', '--border-color': 'var(--gu-grey)', '--color': 'var(--gu-brown-deep)' } as CSSProperties}
            >
              {cancelText}
            </IonButton>
          )}
          <IonButton
            onClick={onConfirm}
            color={tone === 'danger' ? 'danger' : 'primary'}
            style={{ flex: 1, textTransform: 'none' }}
          >
            {confirmText}
          </IonButton>
        </div>
      </div>
    </IonModal>
  );
}
