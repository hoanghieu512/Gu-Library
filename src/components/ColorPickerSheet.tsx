import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent } from '@ionic/react';
import type { CSSProperties } from 'react';
import { MON_PALETTE } from '../storage/palette';

// Sheet đổi màu môn (Home tủ-sách Beat 3a) — tái dùng bảng màu MON_PALETTE (như CreateFolderModal
// v1.5.0). Chạm một ô → onPick(hex) (đóng + ghi ngay). Không đẻ token màu mới.
export default function ColorPickerSheet({ isOpen, monName, current, onPick, onClose }: {
  isOpen: boolean; monName: string; current?: string; onPick: (color: string) => void; onClose: () => void;
}) {
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} initialBreakpoint={0.42} breakpoints={[0, 0.42]}>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="gu-serif" style={{ fontSize: 16 }}>Đổi màu · {monName}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={onClose}>Đóng</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
          {MON_PALETTE.map((hex) => (
            <button
              key={hex}
              onClick={() => onPick(hex)}
              aria-label={`Chọn màu ${hex}`}
              style={{
                width: 56, height: 56, borderRadius: 10, background: hex, padding: 0, cursor: 'pointer',
                border: current === hex ? '3px solid var(--ion-color-primary)' : '3px solid transparent',
                outline: current === hex ? '2px solid #fff' : 'none',
                outlineOffset: current === hex ? '-6px' : undefined,
              } as CSSProperties}
            />
          ))}
        </div>
      </IonContent>
    </IonModal>
  );
}
