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
import { UNFILED } from '../import/prefix';
import { hourglassOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';

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

            {(inboxMap.get(UNFILED) ?? 0) > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginTop: 8,
                background: 'var(--gu-paper-2)', borderRadius: 12, padding: 12,
              }}>
                <div style={{ flex: 1, color: 'var(--gu-grey)', fontStyle: 'italic' }}>
                  Chưa phân loại
                </div>
                <span style={{
                  background: 'var(--gu-pending)', color: '#fff', borderRadius: 999,
                  padding: '2px 10px', fontSize: 12, whiteSpace: 'nowrap',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <IonIcon icon={hourglassOutline} style={{ fontSize: 13 }} />
                  {inboxMap.get(UNFILED)} chờ
                </span>
              </div>
            )}
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
