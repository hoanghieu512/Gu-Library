import type { CSSProperties } from 'react';
import { IonModal, IonButton, IonIcon } from '@ionic/react';
import { alertCircle } from 'ionicons/icons';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;   // mặc định "Xóa"
  onConfirm: () => void;
  onCancel: () => void;
}

// Dialog xác nhận (chống lỡ tay) — IonModal nhỏ giữa màn, palette app. Nút Xóa đỏ đất nhấn mạnh,
// Hủy viền nhạt. Backdrop/back = Hủy (an toàn: đóng = không làm gì).
export default function ConfirmDialog({ isOpen, title, message, confirmText = 'Xóa', onConfirm, onCancel }: Props) {
  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onCancel}
      style={{ '--width': '300px', '--height': 'auto', '--border-radius': '18px', '--background': 'var(--gu-paper-2)' } as CSSProperties}
    >
      <div style={{ padding: 26, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: 'rgba(161,64,44,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
        }}>
          <IonIcon icon={alertCircle} style={{ fontSize: 32, color: 'var(--ion-color-danger)' }} />
        </div>
        <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 18, color: 'var(--gu-brown-deep)' }}>
          {title}
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--gu-grey)', margin: '8px 0 20px', lineHeight: 1.5 }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <IonButton
            fill="outline" onClick={onCancel}
            style={{ flex: 1, textTransform: 'none', '--border-color': 'var(--gu-grey)', '--color': 'var(--gu-brown-deep)' } as CSSProperties}
          >
            Hủy
          </IonButton>
          <IonButton color="danger" onClick={onConfirm} style={{ flex: 1, textTransform: 'none' }}>
            {confirmText}
          </IonButton>
        </div>
      </div>
    </IonModal>
  );
}
