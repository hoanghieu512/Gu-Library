import { useEffect, useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonButton, IonNote,
} from '@ionic/react';
import { listMon } from '../storage/repo';
import { getLastMon } from './inboxRepo';
import { UNFILED } from './prefix';
import MonSwatch from '../components/MonSwatch';
import type { Mon } from '../storage/types';

interface Props {
  isOpen: boolean;
  fileName: string | null;
  onPick: (monName: string) => void;
  onCancel: () => void;
}

export default function ChooseMonSheet({ isOpen, fileName, onPick, onCancel }: Props) {
  const [mons, setMons] = useState<Mon[]>([]);
  const [last, setLast] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try { setMons(await listMon()); } catch { setMons([]); }
      setLast(await getLastMon());
    })();
  }, [isOpen]);

  // Đưa môn vừa dùng lên đầu.
  const ordered = [...mons].sort((a, b) => (a.name === last ? -1 : b.name === last ? 1 : 0));

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onCancel} breakpoints={[0, 0.6, 0.95]} initialBreakpoint={0.6}>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="gu-serif" style={{ fontSize: 16 }}>Lưu vào môn nào?</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {fileName && <IonNote>{fileName}</IonNote>}
        <IonButton expand="block" fill="outline" style={{ margin: '10px 0' }} onClick={() => onPick(UNFILED)}>
          Chưa phân loại
        </IonButton>
        <IonList>
          {ordered.map((m) => (
            <IonItem key={m.uri} button onClick={() => onPick(m.name)}>
              <MonSwatch name={m.name} color={m.meta.color} />
              <IonLabel className="gu-serif" style={{ marginLeft: 12 }}>
                {m.name}{m.name === last ? '  · vừa dùng' : ''}
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonModal>
  );
}
