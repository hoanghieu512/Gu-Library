import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonList, IonItem, IonLabel, IonInput, IonIcon,
} from '@ionic/react';
import { swapHorizontalOutline, printOutline, print, trashOutline } from 'ionicons/icons';

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

const card: CSSProperties = {
  '--background': 'var(--gu-paper-2)', '--border-radius': '14px',
  '--padding-top': '10px', '--padding-bottom': '10px',
} as CSSProperties;

export default function DocActionsSheet({ isOpen, doc, onRename, onMove, onTogglePrint, onDelete, onClose }: Props) {
  const [name, setName] = useState('');
  useEffect(() => { if (isOpen && doc) setName(doc.name); }, [isOpen, doc]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} breakpoints={[0, 0.6]} initialBreakpoint={0.6} expandToScroll={false}>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="gu-title" style={{ fontSize: 17 }}>Tài liệu</IonTitle>
          <IonButtons slot="end"><IonButton fill="clear" onClick={onClose}>Đóng</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ '--padding-start': '16px', '--padding-end': '16px', '--padding-top': '14px' } as CSSProperties}>
        {/* Đổi tên hiển thị (để trống = về tên mặc định) */}
        <IonLabel style={{ fontWeight: 600, fontSize: 13, color: 'var(--gu-brown-deep)' }}>Tên hiển thị</IonLabel>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0 16px' }}>
          <IonInput value={name} placeholder="Để trống = tên mặc định"
            onIonInput={(e) => setName(String(e.detail.value ?? ''))}
            style={{ flex: 1, border: '1px solid var(--ion-color-medium)', borderRadius: 8, padding: '4px 8px' }} />
          <IonButton size="small" shape="round" onClick={() => onRename(name)}>Lưu</IonButton>
        </div>

        <IonList style={{ background: 'transparent' }}>
          <div style={{ marginBottom: 10 }}>
            <IonItem button detail={false} lines="none" onClick={onMove} style={card}>
              <IonIcon icon={swapHorizontalOutline} style={{ color: 'var(--gu-brown)', marginRight: 12 }} />
              <IonLabel className="gu-serif">Chuyển tới…</IonLabel>
            </IonItem>
          </div>
          <div style={{ marginBottom: 10 }}>
            <IonItem button detail={false} lines="none" onClick={onTogglePrint} style={card}>
              <IonIcon icon={doc?.printFlagged ? print : printOutline} style={{ color: 'var(--gu-brown)', marginRight: 12 }} />
              <IonLabel className="gu-serif">{doc?.printFlagged ? 'Bỏ cần in' : 'Đánh dấu cần in'}</IonLabel>
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
