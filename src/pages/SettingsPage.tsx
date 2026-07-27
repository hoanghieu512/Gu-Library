import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon,
  IonSegment, IonSegmentButton, IonLabel,
} from '@ionic/react';
import {
  folderOutline, syncOutline, textOutline, phonePortraitOutline, speedometerOutline, chevronForward,
} from 'ionicons/icons';
import { App } from '@capacitor/app';
import { getRootUri, pickAndSaveRoot } from '../storage/repo';
import { readableTreePath } from '../storage/safPath';
import { getDeviceId } from '../reading/store';
import { getBaseScale, setBaseScale, SCALE_OPTIONS } from '../viewer/fontScale';
import SyncSettings from '../sync/SyncSettings';
import PerfDebugModal from '../perf/PerfDebugModal';
import { useSyncStatus } from '../sync/useSyncStatus';
import { SYNC_MAP } from '../components/SyncPill';

// Màn Cài đặt — mỗi mục là một THẺ GIẤY: icon trong ô nền + tiêu đề serif + giá trị + dòng gợi ý,
// bên phải là chevron (mục bấm được) hoặc trạng thái. Chỉ đổi HÌNH: mọi hành vi (chọn folder,
// mở modal Sync/Perf, đổi cỡ chữ Viewer) giữ nguyên.
const CARD: CSSProperties = {
  background: 'var(--gu-paper-2)', borderRadius: 14, padding: 14, marginBottom: 12,
};

function IconBox({ icon, tint = 'rgba(117,66,14,0.10)', color = 'var(--gu-brown)' }: {
  icon: string; tint?: string; color?: string;
}) {
  return (
    <div style={{
      width: 42, height: 42, borderRadius: 11, background: tint, flex: '0 0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <IonIcon icon={icon} style={{ fontSize: 21, color }} />
    </div>
  );
}

function Row({ icon, tint, iconColor, title, value, hint, trailing, onClick, children }: {
  icon: string; tint?: string; iconColor?: string;
  title: string; value?: ReactNode; hint?: string; trailing?: ReactNode;
  onClick?: () => void; children?: ReactNode;
}) {
  return (
    <div style={{ ...CARD, cursor: onClick ? 'pointer' : undefined }} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <IconBox icon={icon} tint={tint} color={iconColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 15.5, color: 'var(--gu-brown-deep)' }}>
            {title}
          </div>
          {value !== undefined && (
            <div style={{ fontSize: 13.5, color: 'var(--gu-brown)', marginTop: 2, wordBreak: 'break-all' }}>{value}</div>
          )}
          {hint && <div style={{ fontSize: 12, color: 'var(--gu-grey)', marginTop: 2 }}>{hint}</div>}
        </div>
        {trailing && <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>{trailing}</div>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [root, setRoot] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [perfOpen, setPerfOpen] = useState(false);
  const [version, setVersion] = useState<string>(__APP_VERSION__);
  const [deviceId, setDeviceId] = useState<string>('');
  const [scale, setScale] = useState<string>('1');
  // Trạng thái đồng bộ: dùng LẠI hook + bộ nhãn của SyncPill (cùng nguồn với đèn ở Home).
  const { light } = useSyncStatus();
  const sync = SYNC_MAP[light];

  useEffect(() => { getRootUri().then(setRoot); }, []);
  useEffect(() => {
    App.getInfo().then((info) => setVersion(info.version)).catch(() => { /* web/dev */ });
    getDeviceId().then(setDeviceId).catch(() => setDeviceId(''));
    getBaseScale().then((v) => setScale(String(v))).catch(() => setScale('1'));
  }, []);

  const pick = async () => { await pickAndSaveRoot(); setRoot(await getRootUri()); };
  const changeScale = (v: string) => { setScale(v); setBaseScale(parseFloat(v)); };

  const chevron = <IonIcon icon={chevronForward} style={{ color: 'var(--gu-grey)', fontSize: 18 }} />;

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
          title="Đồng bộ (Syncthing)" hint="API key + chọn mini PC"
          onClick={() => setSyncOpen(true)} trailing={chevron}
          value={
            /* Trạng thái để DƯỚI tiêu đề chứ không nhét bên phải: nhãn của app ("Đã đồng bộ",
               "Chưa thấy mini PC") dài hơn chữ "OK" ở bản vẽ nên tranh chỗ, làm tiêu đề gãy 2 dòng. */
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

        <Row
          icon={speedometerOutline} title="Đo hiệu năng (debug)"
          hint="Bảng số đo phiên để lập baseline · không đo gì tự động"
          trailing={chevron} onClick={() => setPerfOpen(true)}
        />

        <SyncSettings isOpen={syncOpen} onClose={() => setSyncOpen(false)} />
        <PerfDebugModal isOpen={perfOpen} onClose={() => setPerfOpen(false)} />
        <p style={{ textAlign: 'center', color: 'var(--gu-grey)', fontSize: 13, marginTop: 24 }}>
          Phiên bản {version}
        </p>
      </IonContent>
    </IonPage>
  );
}
