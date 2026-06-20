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
/* TEMP M6 spike — remove after spikes */
import { Saf } from '../plugins/saf';
import { ShareTarget } from '../plugins/shareTarget';

export default function HomePage() {
  const history = useHistory();
  const { light } = useSyncStatus();
  const [mons, setMons] = useState<Mon[]>([]);
  const [hasRoot, setHasRoot] = useState<boolean | null>(null);
  const [cont, setCont] = useState<Progress | null>(null);
  /* TEMP M6 spike — remove after spikes */
  const [spikeMsg, setSpikeMsg] = useState<string>('');

  const reload = async () => {
    const root = await getRootUri();
    setHasRoot(!!root);
    setCont(await getContinueReading());
    if (root) {
      try { setMons(await listMon()); } catch { setMons([]); }
    } else {
      setMons([]);
    }
  };
  useIonViewWillEnter(() => { reload(); });
  useEffect(() => {
    reload();
    /* TEMP M6 spike — auto-check share on mount */
    (async () => {
      try {
        const r = await ShareTarget.getSharedFile();
        if (r.uri) setSpikeMsg('B nhận (mở từ share): ' + r.name);
      } catch { /* ignore */ }
    })();
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
        {/* TEMP M6 spike — remove after spikes */}
        <div style={{ border: '2px dashed orange', borderRadius: 8, padding: 8, marginBottom: 12 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 6 }}>⚠ TEMP M6 Spike Panel</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={async () => {
                try {
                  const root = await getRootUri();
                  if (!root) { setSpikeMsg('A LỖI: chưa có root URI'); return; }
                  const { uri: inbox } = await Saf.ensureDir({ parentUri: root, name: '_inbox' });
                  const { uri } = await Saf.writeFile({ dirUri: inbox, name: '[Spike] m6-write-test.txt', content: 'M6 spike A ' + new Date().toISOString() });
                  setSpikeMsg('A OK: ' + uri);
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : String(e);
                  setSpikeMsg('A LỖI: ' + msg);
                }
              }}
              style={{ padding: '6px 10px', fontSize: 13 }}
            >
              Spike A: ghi _inbox
            </button>
            <button
              onClick={async () => {
                try {
                  const r = await ShareTarget.getSharedFile();
                  setSpikeMsg(r.uri ? ('B nhận: ' + r.name + ' | ' + r.uri) : 'B: chưa có file share');
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : String(e);
                  setSpikeMsg('B LỖI: ' + msg);
                }
              }}
              style={{ padding: '6px 10px', fontSize: 13 }}
            >
              Spike B: file share?
            </button>
          </div>
          {spikeMsg ? (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, marginTop: 6, background: '#f5f5f5', padding: 6, borderRadius: 4 }}>{spikeMsg}</pre>
          ) : null}
        </div>
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
              : mons.map((m) => <MonCard key={m.uri} mon={m} />)}
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
