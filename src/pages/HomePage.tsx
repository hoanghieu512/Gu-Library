import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, useIonViewWillEnter,
} from '@ionic/react';
import { add, chevronForward } from 'ionicons/icons';

import { useHistory } from 'react-router-dom';
import { App } from '@capacitor/app';
import SyncPill from '../components/SyncPill';
import SearchShortcut from '../components/SearchShortcut';
import ContinueReadingCard from '../components/ContinueReadingCard';
import MonCard from '../components/MonCard';
import ReadingListSheet from '../reading/ReadingListSheet';
import CreateFolderModal from '../components/CreateFolderModal';
import RenameModal from '../components/RenameModal';
import { useSyncStatus } from '../sync/useSyncStatus';
import { listMon, createMon } from '../storage/repo';
import { renameFolder } from '../storage/folderRepo';
import { UNFILED } from '../import/prefix';
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
  const [renameMon, setRenameMon] = useState<Mon | null>(null);
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
      {/* Padding qua biến --padding-* (class ion-padding VÔ HIỆU trên IonContent) → thẻ inset 16px
          khớp màn "Đi in". */}
      <IonContent style={{ '--padding-start': '16px', '--padding-end': '16px', '--padding-top': '16px', '--padding-bottom': '16px' } as CSSProperties}>
        <SearchShortcut />

        {cont && (
          <>
            {/* Heading = nhãn; action "Xem tất cả ›" nằm bên phải, đối xứng "+" của "Môn học".
                Chỉ hiện khi ≥2 tài liệu đang đọc dở — 1 cái đã nằm ở card, mở sheet 1 dòng là thừa.
                Chevron = ngôn ngữ "drill/mở list" (như cuối mỗi hàng môn), tách bạch với chip mũi tên
                "đọc tiếp" trên card. Card tự xử tap đọc-tiếp (stopPropagation) → bỏ lối "tap khu vực" cũ. */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <h2 className="gu-title" style={{ fontSize: 16, margin: 0, paddingInlineStart: 16, color: 'var(--gu-brown)', flex: 1 }}>
                Đang đọc dở
              </h2>
              {reading.length >= 2 && (
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={() => setSheetOpen(true)}
                  aria-label="Xem tất cả tài liệu đang đọc dở"
                  style={{ '--color': 'var(--gu-brown)', textTransform: 'none' } as CSSProperties}
                >
                  Xem tất cả
                  <IonIcon icon={chevronForward} slot="end" />
                </IonButton>
              )}
            </div>
            <ContinueReadingCard item={cont} />
          </>
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
              <h2 className="gu-title" style={{ fontSize: 18, margin: 0, paddingInlineStart: 16, flex: 1 }}>Môn học</h2>
              <IonButton fill="clear" onClick={() => setCreateMonOpen(true)} aria-label="Tạo môn mới">
                <IonIcon icon={add} />
              </IonButton>
            </div>
            {mons.length === 0
              ? <p style={{ color: 'var(--gu-grey)' }}>Chưa có môn nào trong kho.</p>
              : mons.map((m) => (
                <MonCard
                  key={m.uri} mon={m} inboxPending={inboxMap.get(m.name) ?? 0} refreshKey={refreshTick}
                  onRename={m.name === UNFILED ? undefined : () => setRenameMon(m)}
                />
              ))}

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
        noun="môn"
        withColor
        existingNames={mons.map((m) => m.name)}
        onCreate={async (name, color) => { await createMon(name, color!); reload(); }}
        onClose={() => setCreateMonOpen(false)}
      />

      <RenameModal
        isOpen={!!renameMon}
        noun="môn"
        currentName={renameMon?.name ?? ''}
        onSave={async (newName) => {
          if (!renameMon) return null;
          const siblings = mons.filter((m) => m.uri !== renameMon.uri).map((m) => m.name);
          const r = await renameFolder(renameMon.uri, siblings, newName, 'môn');
          return r.ok ? null : r.error; // emitKhoChanged trong renameFolder → Home tự reload
        }}
        onClose={() => setRenameMon(null)}
      />
    </IonPage>
  );
}
