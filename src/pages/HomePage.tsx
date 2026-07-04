import { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, useIonViewWillEnter,
} from '@ionic/react';
import { add } from 'ionicons/icons';

import { useHistory } from 'react-router-dom';
import { App } from '@capacitor/app';
import SyncPill from '../components/SyncPill';
import SearchShortcut from '../components/SearchShortcut';
import ContinueReadingCard from '../components/ContinueReadingCard';
import MonCard from '../components/MonCard';
import ReadingListSheet from '../reading/ReadingListSheet';
import CreateFolderModal from '../components/CreateFolderModal';
import { useSyncStatus } from '../sync/useSyncStatus';
import { listMon, createMon } from '../storage/repo';
import { getRootUri } from '../storage/repo';
import type { ReadingItem } from '../reading/store';
import { listReading, removeReading } from '../reading/store';
import { migrateOnce } from '../reading/migrate';
import type { Mon } from '../storage/types';
import { listInboxByMon } from '../import/inboxRepo';
import { onKhoChanged } from '../lib/khoEvents';
import { countPrintFlagged } from '../print/printRepo';
import { encodeUriParam } from '../storage/uriParam';
import { perfColdReady, afterPaint } from '../perf/perf';
import { invalidateKho } from '../storage/khoSnapshot';

export default function HomePage() {
  const history = useHistory();
  const { light } = useSyncStatus();
  const [mons, setMons] = useState<Mon[]>([]);
  const [hasRoot, setHasRoot] = useState<boolean | null>(null);
  const [reading, setReading] = useState<ReadingItem[]>([]);
  const [inboxMap, setInboxMap] = useState<Map<string, number>>(new Map());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createMonOpen, setCreateMonOpen] = useState(false);
  const [printCount, setPrintCount] = useState(0);
  // Tăng mỗi reload → ép MonCard đếm lại số tài liệu (summarizeMon) khi foreground,
  // vì key=uri ổn định nên MonCard không tự remount.
  const [refreshTick, setRefreshTick] = useState(0);

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
    try { setPrintCount(await countPrintFlagged()); } catch { setPrintCount(0); }
    setRefreshTick((t) => t + 1);
    // Cold start: Trang chủ vẽ xong danh sách lần đầu (perfColdReady chỉ tính 1 lần/phiên).
    afterPaint(perfColdReady);
  };
  // MỘT trigger tải lúc vào màn (useIonViewWillEnter bắn cả lần đầu) → hết reload đúp.
  useIonViewWillEnter(() => { reload(); });
  useEffect(() => {
    // Refresh ngay khi có file mới vào kho (share/thao tác) dù đang ở Home (overlay sheet
    // dismiss không kích hoạt useIonViewWillEnter). Cache khoSnapshot đã bị bỏ ở tầng module
    // TRƯỚC handler này (đăng ký sớm hơn) → reload đọc cây mới.
    const off = onKhoChanged(() => { reload(); });
    // Về foreground: đổi từ máy khác (Syncthing rải về / worker) không phát khoChanged →
    // phải bỏ cache thủ công rồi tải lại để thấy thay đổi như trước.
    const sub = App.addListener('resume', () => { invalidateKho(); reload(); });
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

        {printCount > 0 && (
          <div
            onClick={() => history.push('/print')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, background: 'var(--gu-paper-2)',
              borderRadius: 12, padding: 14, margin: '16px 0 0', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 20 }}>🖨</span>
            <span style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, color: 'var(--gu-brown-deep)', flex: 1 }}>
              Đi in
            </span>
            <span style={{
              background: 'var(--gu-brown)', color: '#fff', borderRadius: 999,
              padding: '2px 10px', fontSize: 13, whiteSpace: 'nowrap',
            }}>
              {printCount}
            </span>
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
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 16 }}>
              <h2 className="gu-title" style={{ fontSize: 18, margin: 0, flex: 1 }}>Môn học</h2>
              <IonButton fill="clear" onClick={() => setCreateMonOpen(true)} aria-label="Tạo môn mới">
                <IonIcon icon={add} />
              </IonButton>
            </div>
            {mons.length === 0
              ? <p style={{ color: 'var(--gu-grey)' }}>Chưa có môn nào trong kho.</p>
              : mons.map((m) => <MonCard key={m.uri} mon={m} inboxPending={inboxMap.get(m.name) ?? 0} refreshKey={refreshTick} />)}

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

      <CreateFolderModal
        isOpen={createMonOpen}
        title="Môn mới"
        withColor
        existingNames={mons.map((m) => m.name)}
        onCreate={async (name, color) => { await createMon(name, color!); reload(); }}
        onClose={() => setCreateMonOpen(false)}
      />
    </IonPage>
  );
}
