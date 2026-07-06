import type { CSSProperties } from 'react';
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
      breakpoints={[0, 0.92]}
      initialBreakpoint={0.92}
      expandToScroll={false}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle className="gu-title" style={{ fontSize: 17 }}>Đang đọc dở</IonTitle>
          <IonButton slot="end" fill="clear" onClick={onClose}>Đóng</IonButton>
        </IonToolbar>
      </IonHeader>
      {/* Padding qua biến --padding-* (class ion-padding vô hiệu trên IonContent) → thẻ inset 16px đồng bộ Trang chủ. */}
      <IonContent style={{ '--padding-start': '16px', '--padding-end': '16px', '--padding-top': '16px', '--padding-bottom': '16px' } as CSSProperties}>
        {items.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--gu-grey)', marginTop: 32 }}>
            Chưa có tài liệu nào đang đọc.
          </p>
        )}
        <IonList style={{ background: 'transparent' }}>
          {items.map((item, idx) => {
            const newest = idx === 0; // thẻ mới nhất = nâu/kem (đồng bộ card Home); còn lại = giấy ấm
            const fg = newest ? 'var(--gu-cream)' : 'var(--gu-grey)';
            return (
              // bo góc + overflow:hidden ở div bọc → thẻ và nút "Bỏ" liền khối, cùng cắt theo khối bo
              <div key={item.path} style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden' }}>
                <IonItemSliding>
                  <IonItem
                    button detail={false} lines="none" onClick={() => onOpen(item.uri)}
                    style={{
                      '--background': newest ? 'var(--gu-brown-deep)' : 'var(--gu-paper-2)',
                      '--color': newest ? 'var(--gu-cream)' : 'var(--gu-brown-deep)',
                      '--border-radius': '0',
                      '--padding-top': '10px', '--padding-bottom': '10px',
                    } as CSSProperties}
                  >
                    <IonLabel>
                      <h2 style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700 }}>{item.name}</h2>
                      <p style={{ fontSize: 13, color: fg }}>{item.monName}</p>
                      <p style={{ fontSize: 12, color: fg }}>Trang {item.page} / {item.total}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItemOptions side="end">
                    <IonItemOption color="danger" onClick={() => onRemove(item.path)}>Bỏ</IonItemOption>
                  </IonItemOptions>
                </IonItemSliding>
              </div>
            );
          })}
        </IonList>
      </IonContent>
    </IonModal>
  );
}
