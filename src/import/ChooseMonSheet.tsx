import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonNote,
} from '@ionic/react';
import { listMon } from '../storage/repo';
import { getLastMon } from './inboxRepo';
import { UNFILED } from './prefix';
import MonSwatch from '../components/MonSwatch';
import UnfiledSwatch from '../components/UnfiledSwatch';
import type { Mon } from '../storage/types';

interface Props {
  isOpen: boolean;
  note: string | null;
  onPick: (monName: string) => void;
  onCancel: () => void;
}

// Thẻ giấy bo góc cho mỗi môn (rời, cách nhau khoảng trống).
const card: CSSProperties = {
  '--background': 'var(--gu-paper-2)',
  '--border-radius': '14px',
  '--padding-top': '10px',
  '--padding-bottom': '10px',
} as CSSProperties;

export default function ChooseMonSheet({ isOpen, note, onPick, onCancel }: Props) {
  const [mons, setMons] = useState<Mon[]>([]);
  const [last, setLast] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try { setMons(await listMon()); } catch { setMons([]); }
      setLast(await getLastMon());
    })();
  }, [isOpen]);

  // Bỏ folder "Chưa phân loại" khỏi danh sách (thẻ fallback cuối đã lo) + đưa môn vừa dùng lên đầu.
  const ordered = mons
    .filter((m) => m.name !== UNFILED)
    .sort((a, b) => (a.name === last ? -1 : b.name === last ? 1 : 0));

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onCancel} breakpoints={[0, 0.92]} initialBreakpoint={0.92} expandToScroll={false}>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="gu-title" style={{ fontSize: 17 }}>Lưu vào môn nào?</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {note && <IonNote>{note}</IonNote>}
        <IonList style={{ background: 'transparent' }}>
          {ordered.map((m) => (
            <div key={m.uri} style={{ marginBottom: 10 }}>
              <IonItem button detail={false} lines="none" onClick={() => onPick(m.name)} style={card}>
                <MonSwatch name={m.name} color={m.meta.color} icon={m.meta.icon} />
                <IonLabel className="gu-serif" style={{ marginLeft: 12 }}>
                  {m.name}{m.name === last ? '  · vừa dùng' : ''}
                </IonLabel>
              </IonItem>
            </div>
          ))}
          {/* Fallback = thẻ mờ (xám italic, ô viền đứt), đặt cuối */}
          <div style={{ marginBottom: 10 }}>
            <IonItem button detail={false} lines="none" onClick={() => onPick(UNFILED)} style={card}>
              <UnfiledSwatch />
              <IonLabel color="medium" style={{ marginLeft: 12, fontStyle: 'italic' }}>
                Chưa phân loại
              </IonLabel>
            </IonItem>
          </div>
        </IonList>
      </IonContent>
    </IonModal>
  );
}
