import { useEffect, useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonItem, IonLabel, IonInput, IonList, IonRadioGroup, IonRadio, IonText, IonNote,
} from '@ionic/react';
import {
  getSyncConfig, setApiKey, setMinipcId, listOtherDevices, checkConnection,
  type DeviceInfo,
} from './config';

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
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Đồng bộ (Syncthing)</IonTitle>
          <IonButtons slot="end"><IonButton onClick={onClose}>Đóng</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">API key (của Syncthing trên máy này)</IonLabel>
          <IonInput value={key} onIonInput={(e) => setKey(e.detail.value ?? '')} placeholder="dán API key" />
        </IonItem>
        <IonButton expand="block" onClick={saveKeyAndLoad}>Lưu key + kiểm tra kết nối</IonButton>

        {version && <IonText color="success"><p>Đã kết nối — Syncthing {version}</p></IonText>}
        {error && <IonText color="danger"><p>Lỗi: {error}</p></IonText>}

        {devices.length > 0 && (
          <>
            <IonNote>Chọn thiết bị nào là mini PC:</IonNote>
            <IonRadioGroup value={minipc} onIonChange={(e) => pick(e.detail.value)}>
              <IonList>
                {devices.map((d) => (
                  <IonItem key={d.deviceID}>
                    <IonLabel>{d.name}</IonLabel>
                    <IonRadio slot="end" value={d.deviceID} />
                  </IonItem>
                ))}
              </IonList>
            </IonRadioGroup>
          </>
        )}
      </IonContent>
    </IonModal>
  );
}
