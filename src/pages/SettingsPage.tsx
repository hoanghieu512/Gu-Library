import { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonNote, IonSegment, IonSegmentButton,
} from '@ionic/react';
import { App } from '@capacitor/app';
import { getRootUri, pickAndSaveRoot } from '../storage/repo';
import { readableTreePath } from '../storage/safPath';
import { getDeviceId } from '../reading/store';
import { getBaseScale, setBaseScale, SCALE_OPTIONS } from '../viewer/fontScale';
import SyncSettings from '../sync/SyncSettings';

export default function SettingsPage() {
  const [root, setRoot] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [version, setVersion] = useState<string>(__APP_VERSION__);
  const [deviceId, setDeviceId] = useState<string>('');
  const [scale, setScale] = useState<string>('1');

  useEffect(() => { getRootUri().then(setRoot); }, []);
  useEffect(() => {
    App.getInfo().then((info) => setVersion(info.version)).catch(() => { /* web/dev */ });
    getDeviceId().then(setDeviceId).catch(() => setDeviceId(''));
    getBaseScale().then((v) => setScale(String(v))).catch(() => setScale('1'));
  }, []);

  const pick = async () => { await pickAndSaveRoot(); setRoot(await getRootUri()); };
  const changeScale = (v: string) => { setScale(v); setBaseScale(parseFloat(v)); };

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Cài đặt</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding">
        <IonList>
          <IonItem button onClick={pick}>
            <IonLabel>
              <h2>Folder kho</h2>
              <IonNote>{root ? readableTreePath(root) : 'Chưa chọn — bấm để chọn folder Syncthing'}</IonNote>
              <p style={{ fontSize: 12, color: 'var(--gu-grey)', marginTop: 2 }}>Bấm để chọn / cấp lại quyền folder kho</p>
            </IonLabel>
          </IonItem>

          <IonItem button onClick={() => setSyncOpen(true)}>
            <IonLabel><h2>Đồng bộ (Syncthing)</h2><IonNote>API key + chọn mini PC</IonNote></IonLabel>
          </IonItem>

          <IonItem lines="none">
            <IonLabel>
              <h2>Cỡ chữ Viewer</h2>
              <IonNote>Cỡ mặc định khi mở tài liệu (vẫn pinch-zoom được)</IonNote>
              <IonSegment value={scale} onIonChange={(e) => changeScale(String(e.detail.value ?? '1'))} style={{ marginTop: 8 }}>
                {SCALE_OPTIONS.map((o) => (
                  <IonSegmentButton key={o.value} value={String(o.value)}>
                    <IonLabel>{o.label}</IonLabel>
                  </IonSegmentButton>
                ))}
              </IonSegment>
            </IonLabel>
          </IonItem>

          <IonItem lines="none">
            <IonLabel>
              <h2>Thông tin máy này</h2>
              <IonNote style={{ wordBreak: 'break-all' }}>{deviceId || '—'}</IonNote>
              <p style={{ fontSize: 12, color: 'var(--gu-grey)', marginTop: 2 }}>Khớp tên file _reading-&lt;id&gt;.json</p>
            </IonLabel>
          </IonItem>
        </IonList>

        <SyncSettings isOpen={syncOpen} onClose={() => setSyncOpen(false)} />
        <p style={{ textAlign: 'center', color: 'var(--gu-grey)', fontSize: 13, marginTop: 24 }}>
          Phiên bản {version}
        </p>
      </IonContent>
    </IonPage>
  );
}
