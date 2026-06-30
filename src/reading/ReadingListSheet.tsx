import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonLabel, IonButton,
} from '@ionic/react';
import type { ReadingItem } from './store';

interface Props {
  isOpen: boolean;
  items: ReadingItem[];
  onOpen: (uri: string) => void;
  onRemove: (path: string) => void;
  onClose: () => void;
}

export default function ReadingListSheet({ isOpen, items, onOpen, onRemove, onClose }: Props) {
  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      breakpoints={[0, 0.6, 0.95]}
      initialBreakpoint={0.6}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle className="gu-title" style={{ fontSize: 17 }}>Đang đọc dở</IonTitle>
          <IonButton slot="end" fill="clear" onClick={onClose}>Đóng</IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {items.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--gu-grey)', marginTop: 32 }}>
            Chưa có tài liệu nào đang đọc.
          </p>
        )}
        <IonList>
          {items.map((item) => (
            <IonItemSliding key={item.path}>
              <IonItem button onClick={() => onOpen(item.uri)} detail={false}>
                <IonLabel>
                  <h2 style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700 }}>{item.name}</h2>
                  <p style={{ fontSize: 13 }}>{item.monName}</p>
                  <p style={{ fontSize: 12, color: 'var(--gu-grey)' }}>
                    Trang {item.page} / {item.total}
                  </p>
                </IonLabel>
              </IonItem>
              <IonItemOptions side="end">
                <IonItemOption color="danger" onClick={() => onRemove(item.path)}>
                  Bỏ
                </IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          ))}
        </IonList>
      </IonContent>
    </IonModal>
  );
}
