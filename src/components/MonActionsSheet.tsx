import type { CSSProperties } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonList, IonItem, IonLabel, IonIcon,
} from '@ionic/react';
import { colorPaletteOutline, createOutline, trashOutline } from 'ionicons/icons';
import type { Mon } from '../storage/types';

// Sheet thao tác MÔN (Home tủ-sách Beat 3a) — bung khi NHẤN GIỮ gáy sách. Cùng phong cách sheet
// thẻ-rời với DocActionsSheet: header = tên môn + 3 nút card (Đổi màu / Đổi tên / Xóa). Thay
// IonActionSheet mặc định (huynh muốn giống sheet trong màn duyệt). "Chưa phân loại" không tới đây.
const card: CSSProperties = {
  '--background': 'var(--gu-paper-2)', '--border-radius': '14px',
  '--padding-top': '12px', '--padding-bottom': '12px',
} as CSSProperties;

export default function MonActionsSheet({ mon, onColor, onRename, onDelete, onClose }: {
  mon: Mon | null; onColor: () => void; onRename: () => void; onDelete: () => void; onClose: () => void;
}) {
  return (
    <IonModal isOpen={!!mon} onDidDismiss={onClose} breakpoints={[0, 0.44]} initialBreakpoint={0.44} expandToScroll={false}>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="gu-title" style={{ fontSize: 17 }}>{mon?.name}</IonTitle>
          <IonButtons slot="end"><IonButton fill="clear" onClick={onClose}>Đóng</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ '--padding-start': '16px', '--padding-end': '16px', '--padding-top': '16px' } as CSSProperties}>
        <IonList style={{ background: 'transparent' }}>
          <div style={{ marginBottom: 10 }}>
            <IonItem button detail={false} lines="none" onClick={onColor} style={card}>
              <IonIcon icon={colorPaletteOutline} style={{ color: 'var(--gu-brown)', marginRight: 12 }} />
              <IonLabel className="gu-serif">Đổi màu</IonLabel>
            </IonItem>
          </div>
          <div style={{ marginBottom: 10 }}>
            <IonItem button detail={false} lines="none" onClick={onRename} style={card}>
              <IonIcon icon={createOutline} style={{ color: 'var(--gu-brown)', marginRight: 12 }} />
              <IonLabel className="gu-serif">Đổi tên</IonLabel>
            </IonItem>
          </div>
          <div style={{ marginBottom: 10 }}>
            <IonItem button detail={false} lines="none" onClick={onDelete} style={card}>
              <IonIcon icon={trashOutline} style={{ color: 'var(--ion-color-danger)', marginRight: 12 }} />
              <IonLabel style={{ color: 'var(--ion-color-danger)' }}>Xóa</IonLabel>
            </IonItem>
          </div>
        </IonList>
      </IonContent>
    </IonModal>
  );
}
