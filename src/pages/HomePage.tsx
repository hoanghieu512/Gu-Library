import { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, useIonViewWillEnter,
} from '@ionic/react';

import { useHistory } from 'react-router-dom';
import { App } from '@capacitor/app';
import SyncPill from '../components/SyncPill';
import SearchShortcut from '../components/SearchShortcut';
import ContinueReadingCard from '../components/ContinueReadingCard';
import MonCard from '../components/MonCard';
import ReadingListSheet from '../reading/ReadingListSheet';
import { useSyncStatus } from '../sync/useSyncStatus';
import { listMon } from '../storage/repo';
import { getRootUri } from '../storage/repo';
import type { ReadingItem } from '../reading/store';
import { listReading, removeReading } from '../reading/store';
import { migrateOnce } from '../reading/migrate';
import type { Mon } from '../storage/types';
import { listInboxByMon } from '../import/inboxRepo';
import { onKhoChanged } from '../lib/khoEvents';
import { encodeUriParam } from '../storage/uriParam';

export default function HomePage() {
  const history = useHistory();
  const { light } = useSyncStatus();
  const [mons, setMons] = useState<Mon[]>([]);
  const [hasRoot, setHasRoot] = useState<boolean | null>(null);
  const [reading, setReading] = useState<ReadingItem[]>([]);
  const [inboxMap, setInboxMap] = useState<Map<string, number>>(new Map());
  const [sheetOpen, setSheetOpen] = useState(false);

  const reload = async () => {
    const root = await getRootUri();
    setHasRoot(!!root);
    await migrateOnce();
    setReading(await listReading());
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
    const off = onKhoChanged(() => { reload(); });
    // Re-scan khi app về foreground (sync từ máy khác, đọc dở ở máy khác, v.v.).
    const sub = App.addListener('resume', () => { reload(); });
    return () => {
      off();
      sub.then((h) => h.remove());
    };
  }, []);

  const cont: ReadingItem | null = reading[0] ?? null;

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

        {cont && (
          // Tapping the surrounding area opens the sheet; card tap opens viewer directly.
          <div onClick={() => setSheetOpen(true)} style={{ cursor: 'pointer' }}>
            <h2 className="gu-title" style={{ fontSize: 16, margin: '0 0 4px', color: 'var(--gu-brown)' }}>
              Đang đọc dở
            </h2>
            <ContinueReadingCard item={cont} />
          </div>
        )}

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

      <ReadingListSheet
        isOpen={sheetOpen}
        items={reading}
        onOpen={(uri) => { setSheetOpen(false); history.push(`/viewer/${encodeUriParam(uri)}`); }}
        onRemove={async (path) => { await removeReading(path); reload(); }}
        onClose={() => setSheetOpen(false)}
      />
    </IonPage>
  );
}
