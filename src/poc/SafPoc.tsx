import { useEffect, useState } from 'react';
import { IonButton, IonList, IonItem, IonLabel, IonText } from '@ionic/react';
import { Preferences } from '@capacitor/preferences';
import { Saf } from '../plugins/saf';
import type { SafEntry } from '../plugins/saf';

const ROOT_KEY = 'saf_root_uri';

export default function SafPoc() {
  const [rootUri, setRootUri] = useState<string | null>(null);
  const [granted, setGranted] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<SafEntry[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { value } = await Preferences.get({ key: ROOT_KEY });
      if (!value) return;
      setRootUri(value);
      try {
        const { granted } = await Saf.hasPermission({ uri: value });
        setGranted(granted);
        if (granted) {
          const { entries } = await Saf.listFolder({ uri: value });
          setEntries(entries);
        }
      } catch (e: any) {
        setError(String(e?.message ?? e));
      }
    })();
  }, []);

  const pick = async () => {
    setError('');
    try {
      const { uri } = await Saf.pickFolder();
      await Preferences.set({ key: ROOT_KEY, value: uri });
      setRootUri(uri);
      setGranted(true);
      const { entries } = await Saf.listFolder({ uri });
      setEntries(entries);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  return (
    <div>
      <IonButton onClick={pick}>Chọn folder kho (SAF)</IonButton>
      <IonText><p>rootUri: {rootUri ?? '(chưa chọn)'}</p></IonText>
      <IonText><p>granted sau restart: {granted === null ? '—' : String(granted)}</p></IonText>
      {error && <IonText color="danger"><p>Lỗi: {error}</p></IonText>}
      <IonList>
        {entries.map((e) => (
          <IonItem key={e.uri}>
            <IonLabel>{e.isDirectory ? '📁 ' : '📄 '}{e.name}</IonLabel>
          </IonItem>
        ))}
      </IonList>
    </div>
  );
}
