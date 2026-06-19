import { useEffect, useState } from 'react';
import {
  IonButton, IonList, IonItem, IonLabel, IonText, IonBadge, IonNote, IonChip,
} from '@ionic/react';
import {
  listMon, listFolder, pickAndSaveRoot, rootHasPermission,
} from '../storage/repo';
import type { Mon, FolderListing } from '../storage/types';

interface Crumb { name: string; uri: string; }

export default function SafPoc() {
  const [hasRoot, setHasRoot] = useState(false);
  const [mons, setMons] = useState<Mon[]>([]);
  const [stack, setStack] = useState<Crumb[]>([]);
  const [listing, setListing] = useState<FolderListing | null>(null);
  const [error, setError] = useState('');

  const loadMons = async () => {
    try { setMons(await listMon()); }
    catch (e: any) { setError(String(e?.message ?? e)); }
  };

  useEffect(() => {
    (async () => {
      const ok = await rootHasPermission();
      setHasRoot(ok);
      if (ok) await loadMons();
    })();
  }, []);

  const pick = async () => {
    setError('');
    try {
      await pickAndSaveRoot();
      setHasRoot(true);
      setStack([]); setListing(null);
      await loadMons();
    } catch (e: any) { setError(String(e?.message ?? e)); }
  };

  const drill = async (c: Crumb, depth: number) => {
    try {
      const l = await listFolder(c.uri);
      setListing(l);
      setStack((s) => [...s.slice(0, depth), c]);
    } catch (e: any) { setError(String(e?.message ?? e)); }
  };

  const goHome = () => { setStack([]); setListing(null); };

  return (
    <div>
      <IonButton size="small" onClick={pick}>Chọn folder kho (SAF)</IonButton>
      {error && <IonText color="danger"><p>Lỗi: {error}</p></IonText>}
      {!hasRoot && <IonText><p>Chưa chọn kho (hoặc mất quyền).</p></IonText>}

      {hasRoot && (
        <p>
          <IonChip onClick={goHome}>Kho</IonChip>
          {stack.map((c, i) => (
            <IonChip key={c.uri} onClick={() => drill(c, i)}>{c.name}</IonChip>
          ))}
        </p>
      )}

      {hasRoot && stack.length === 0 && (
        <IonList>
          <IonText><p><b>Môn ({mons.length})</b></p></IonText>
          {mons.map((m) => (
            <IonItem key={m.uri} button onClick={() => drill({ name: m.name, uri: m.uri }, 0)}>
              <IonLabel>{m.name}</IonLabel>
              {m.meta.color && (
                <span slot="end" style={{
                  width: 14, height: 14, borderRadius: 7, background: m.meta.color,
                  display: 'inline-block',
                }} />
              )}
              {m.meta.order !== undefined && <IonNote slot="end">#{m.meta.order}</IonNote>}
            </IonItem>
          ))}
        </IonList>
      )}

      {hasRoot && listing && (
        <IonList>
          {listing.folders.map((f) => (
            <IonItem key={f.uri} button onClick={() => drill({ name: f.name, uri: f.uri }, stack.length)}>
              <IonLabel>📁 {f.name}</IonLabel>
            </IonItem>
          ))}
          {listing.documents.map((d) => (
            <IonItem key={d.pdfUri}>
              <IonLabel>📄 {d.name}</IonLabel>
              <IonNote slot="end">PDF+JSON</IonNote>
            </IonItem>
          ))}
          {listing.pending.map((p) => (
            <IonItem key={p.sourceUri}>
              <IonLabel color="medium">⏳ {p.name}</IonLabel>
              <IonBadge slot="end" color="warning">chờ xử lý</IonBadge>
            </IonItem>
          ))}
        </IonList>
      )}
    </div>
  );
}
