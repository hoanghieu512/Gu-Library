import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  IonButton, IonItem, IonLabel, IonInput, IonList, IonRadioGroup, IonRadio, IonNote,
} from '@ionic/react';
import GuSheet from '../components/GuSheet';
import { StatusPill } from '../components/KhoRow';
import {
  getSyncConfig, setApiKey, setMinipcId, listOtherDevices, checkConnection,
  type DeviceInfo,
} from './config';

// B3 (10a/10b) — CHỈ áp da: vỏ chung `GuSheet` (kèm SỬA lề: file này còn dính
// `className="ion-padding"` VÔ HIỆU trên IonContent — bài học v1.10.0) + pill trạng thái dùng
// chung + thẻ giấy. TOÀN BỘ LOGIC đồng bộ GIỮ NGUYÊN: đọc/ghi API key, checkConnection,
// listOtherDevices, chọn mini PC, ngưỡng và thông báo — không đổi một dòng.
export default function SyncSettings({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [key, setKey] = useState('');
  const [minipc, setMinipc] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [version, setVersion] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const c = await getSyncConfig();
      setKey(c.apiKey ?? '');
      setMinipc(c.minipcId);
      setError(''); setVersion('');
    })();
  }, [isOpen]);

  const saveKeyAndLoad = async () => {
    setError(''); setVersion('');
    try {
      await setApiKey(key);
      const v = await checkConnection(key);
      setVersion(v);
      setDevices(await listOtherDevices(key));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  const pick = async (id: string) => {
    setMinipc(id);
    await setMinipcId(id);
  };

  return (
    <GuSheet isOpen={isOpen} onClose={onClose} title="Đồng bộ (Syncthing)" variant="full">
        <div style={{ background: 'var(--gu-paper-2)', borderRadius: 14, padding: '4px 4px 12px' }}>
          <IonItem lines="none" style={{ '--background': 'transparent' } as CSSProperties}>
            <IonLabel position="stacked" style={{ color: 'var(--gu-brown-deep)', fontWeight: 600 }}>
              API key (của Syncthing trên máy này)
            </IonLabel>
            <IonInput value={key} onIonInput={(e) => setKey(e.detail.value ?? '')} placeholder="dán API key" />
          </IonItem>
        </div>
        <IonButton expand="block" onClick={saveKeyAndLoad} style={{ marginTop: 16, height: 48 } as CSSProperties}>
          Lưu key + kiểm tra kết nối
        </IonButton>

        {/* Trạng thái: dùng lại pill sẵn có (KhoRow.StatusPill) — không đẻ kiểu báo trạng thái mới */}
        {version && (
          <div style={{ marginTop: 14 }}>
            <StatusPill text={`Đã kết nối — Syncthing ${version}`} />
          </div>
        )}
        {error && (
          <div style={{ marginTop: 14 }}>
            <StatusPill text={`Lỗi: ${error}`} color="var(--ion-color-danger)" />
          </div>
        )}

        {devices.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <IonNote style={{ color: 'var(--gu-grey)', fontSize: 13 }}>Chọn thiết bị nào là mini PC:</IonNote>
            <IonRadioGroup value={minipc} onIonChange={(e) => pick(e.detail.value)}>
              <IonList style={{ background: 'transparent', marginTop: 8 }}>
                {devices.map((d) => (
                  <div key={d.deviceID} style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden' }}>
                    <IonItem lines="none" style={{ '--background': 'var(--gu-paper-2)', '--border-radius': '0' } as CSSProperties}>
                      <IonLabel className="gu-serif">{d.name}</IonLabel>
                      <IonRadio slot="end" value={d.deviceID} />
                    </IonItem>
                  </div>
                ))}
              </IonList>
            </IonRadioGroup>
          </div>
        )}
    </GuSheet>
  );
}
