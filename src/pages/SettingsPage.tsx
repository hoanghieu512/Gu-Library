import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonSegment, IonSegmentButton, IonLabel,
} from '@ionic/react';
import {
  folderOutline, syncOutline, textOutline, phonePortraitOutline, searchOutline,
} from 'ionicons/icons';
import { getRootUri, pickAndSaveRoot } from '../storage/repo';
import { readableTreePath } from '../storage/safPath';
import { getDeviceId } from '../reading/store';
import { getBaseScale, setBaseScale, SCALE_OPTIONS } from '../viewer/fontScale';
import SyncSettings from '../sync/SyncSettings';
import WhatsNewEntry from '../components/WhatsNewEntry';
import Row, { Chevron } from '../components/SettingsRow';
import { useSyncStatus } from '../sync/useSyncStatus';
import { clearIndex } from '../search/store';
import { useGuToast } from '../lib/useGuToast';
import { SYNC_MAP } from '../components/SyncPill';

// Settings: every item is a paper card (`SettingsRow`). Only the LOOK is shared: every behaviour
// (pick the folder, open the Sync/Perf modals, change the Viewer font size) stays here.
export default function SettingsPage() {
  const { toastResult, node: toastNode } = useGuToast();
  const [root, setRoot] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');
  const [scale, setScale] = useState<string>('1');
  // Trạng thái đồng bộ: dùng LẠI hook + bộ nhãn của SyncPill (cùng nguồn với đèn ở Home).
  const { light } = useSyncStatus();
  const sync = SYNC_MAP[light];

  useEffect(() => { getRootUri().then(setRoot); }, []);
  useEffect(() => {
    getDeviceId().then(setDeviceId).catch(() => setDeviceId(''));
    getBaseScale().then((v) => setScale(String(v))).catch(() => setScale('1'));
  }, []);

  const pick = async () => { await pickAndSaveRoot(); setRoot(await getRootUri()); };
  const changeScale = (v: string) => { setScale(v); setBaseScale(parseFloat(v)); };

  const chevron = <Chevron />;

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle className="gu-title">Cài đặt</IonTitle></IonToolbar></IonHeader>
      {/* `ion-padding` VÔ HIỆU trên IonContent (bài học v1.10.0) → lề qua biến --padding-*. */}
      <IonContent style={{ '--padding-start': '16px', '--padding-end': '16px', '--padding-top': '16px', '--padding-bottom': '16px' } as CSSProperties}>
        <Row
          icon={folderOutline} title="Folder kho"
          value={root ? readableTreePath(root) : 'Chưa chọn'}
          hint="Bấm để chọn / cấp lại quyền folder kho"
          trailing={chevron} onClick={pick}
        />

        <Row
          icon={syncOutline} tint="rgba(45,211,111,0.14)" iconColor="var(--ion-color-success)"
          title="Đồng bộ (Syncthing)" hint="API key + chọn Atomman"
          onClick={() => setSyncOpen(true)} trailing={chevron}
          value={
            /* Trạng thái để DƯỚI tiêu đề chứ không nhét bên phải: nhãn của app ("Đã đồng bộ",
               "Chưa thấy Atomman") dài hơn chữ "OK" ở bản vẽ nên tranh chỗ, làm tiêu đề gãy 2 dòng. */
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 9, height: 9, borderRadius: '50%', flex: '0 0 auto',
                background: `var(--ion-color-${sync.color})`,
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gu-brown-deep)' }}>{sync.label}</span>
            </span>
          }
        />

        <Row icon={textOutline} title="Cỡ chữ Viewer" hint="Cỡ mặc định khi mở tài liệu (vẫn pinch-zoom được)">
          <IonSegment
            value={scale} onIonChange={(e) => changeScale(String(e.detail.value ?? '1'))}
            style={{ marginTop: 12, '--background': 'var(--gu-cream)' } as CSSProperties}
          >
            {SCALE_OPTIONS.map((o) => (
              <IonSegmentButton key={o.value} value={String(o.value)}>
                <IonLabel style={{ textTransform: 'none', fontSize: 13.5 }}>{o.label}</IonLabel>
              </IonSegmentButton>
            ))}
          </IonSegment>
        </Row>

        <Row
          icon={phonePortraitOutline} title="Thông tin máy này"
          value={<span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{deviceId || '—'}</span>}
          hint="Khớp tên file _reading-<id>.json"
        />

        {/* Chỉ mục tìm kiếm là DỮ LIỆU PHÁI SINH (spec §4.3): hỏng/lệch thì xoá dựng lại, không
            có gì để mất. Đây là cần gạt đó — lần vào màn Tìm kế tiếp sẽ tự dựng lại từ đầu. */}
        <Row
          icon={searchOutline} title="Dựng lại chỉ mục tìm kiếm"
          hint="Dùng khi tìm ra kết quả cũ hoặc thiếu · lần vào màn Tìm sau sẽ đọc lại cả kho"
          trailing={chevron}
          onClick={async () => {
            await clearIndex();
            toastResult('Đã xoá chỉ mục — mở màn Tìm để dựng lại', true);
          }}
        />

        <WhatsNewEntry />

        <SyncSettings isOpen={syncOpen} onClose={() => setSyncOpen(false)} />
        {toastNode}
      </IonContent>
    </IonPage>
  );
}
