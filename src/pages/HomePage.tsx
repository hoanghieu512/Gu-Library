import { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, useIonViewWillEnter,
} from '@ionic/react';

import { useHistory } from 'react-router-dom';
import SyncPill from '../components/SyncPill';
import SearchShortcut from '../components/SearchShortcut';
import ContinueReadingCard from '../components/ContinueReadingCard';
import MonCard from '../components/MonCard';
import { useSyncStatus } from '../sync/useSyncStatus';
import { listMon } from '../storage/repo';
import { getRootUri } from '../storage/repo';
import { getContinueReading } from '../reading/progress';
import type { Progress } from '../reading/progress';
import type { Mon } from '../storage/types';
import { listInboxByMon } from '../import/inboxRepo';
import { onKhoChanged } from '../lib/khoEvents';

export default function HomePage() {
  const history = useHistory();
  const { light } = useSyncStatus();
  const [mons, setMons] = useState<Mon[]>([]);
  const [hasRoot, setHasRoot] = useState<boolean | null>(null);
  const [cont, setCont] = useState<Progress | null>(null);
  const [inboxMap, setInboxMap] = useState<Map<string, number>>(new Map());

  const reload = async () => {
    const root = await getRootUri();
    setHasRoot(!!root);
    setCont(await getContinueReading());
    if (root) {
      try { setMons(await listMon()); } catch { setMons([]); }
    } else {
      setMons([]);
    }
    try { setInboxMap(await listInboxByMon()); } catch { setInboxMap(new Map()); }
  };
  useIonViewWillEnter(() => { reload(); });
  useEffect(() => {
    reload();
    // Refresh ngay khi có file mới vào kho (share) dù đang ở Home (overlay sheet
    // dismiss không kích hoạt useIonViewWillEnter).
    return onKhoChanged(() => { reload(); });
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="gu-title">Gú's Library</IonTitle>
          <IonButtons slot="end">
            <SyncPill state={light} onClick={() => history.push('/settings')} />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <SearchShortcut />

        {cont && <ContinueReadingCard progress={cont} />}

        {hasRoot === false && (
          <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--gu-brown)' }}>
            <p>Chưa chọn folder kho.</p>
            <p style={{ fontSize: 14 }}>Vào <b>Cài đặt → Folder kho</b> để chọn folder Syncthing.</p>
          </div>
        )}

        {hasRoot && (
          <>
            <h2 className="gu-title" style={{ fontSize: 18, marginTop: 16 }}>Môn học</h2>
            {mons.length === 0
              ? <p style={{ color: 'var(--gu-grey)' }}>Chưa có môn nào trong kho.</p>
              : mons.map((m) => <MonCard key={m.uri} mon={m} inboxPending={inboxMap.get(m.name) ?? 0} />)}

          </>
        )}
      </IonContent>
    </IonPage>
  );
}
