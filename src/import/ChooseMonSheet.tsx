import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonList, IonItem, IonLabel, IonNote, IonInput, IonIcon, IonSpinner,
} from '@ionic/react';
import { arrowBack, folderOutline, addCircleOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { listMon, listFolder, createSubfolder } from '../storage/repo';
import { getLastMon } from './inboxRepo';
import { UNFILED } from './prefix';
import { validateFolderName } from '../storage/folderName';
import MonSwatch from '../components/MonSwatch';
import UnfiledSwatch from '../components/UnfiledSwatch';
import type { Mon, SubFolder } from '../storage/types';

interface Props {
  isOpen: boolean;
  note: string | null;
  onPick: (path: string[]) => void;   // đường đích từ môn xuống (["Luật Đất đai","Bài giảng"])
  onCancel: () => void;
}

const card: CSSProperties = {
  '--background': 'var(--gu-paper-2)', '--border-radius': '14px',
  '--padding-top': '10px', '--padding-bottom': '10px',
} as CSSProperties;

type Level = { name: string; uri: string; folders: SubFolder[] };

export default function ChooseMonSheet({ isOpen, note, onPick, onCancel }: Props) {
  const [mons, setMons] = useState<Mon[]>([]);
  const [last, setLast] = useState<string | null>(null);
  const [stack, setStack] = useState<Level[]>([]);   // [] = bước 1 (root); sâu hơn = drill
  const [busy, setBusy] = useState(false);
  const [newMode, setNewMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [newErr, setNewErr] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStack([]); setNewMode(false); setNewName(''); setNewErr(''); setBusy(false);
    (async () => {
      try { setMons(await listMon()); } catch { setMons([]); }
      setLast(await getLastMon());
    })();
  }, [isOpen]);

  const ordered = mons
    .filter((m) => m.name !== UNFILED)
    .sort((a, b) => (a.name === last ? -1 : b.name === last ? 1 : 0));

  const path = stack.map((s) => s.name);
  const cur = stack[stack.length - 1] ?? null;
  const atRoot = stack.length === 0;

  // Tap môn ở bước 1: có thư mục con → drill sang bước 2; không có → lưu thẳng (zero đổi).
  const tapMon = async (m: Mon) => {
    setBusy(true);
    try {
      const folders = (await listFolder(m.uri)).folders;
      if (folders.length === 0) { onPick([m.name]); return; }
      setStack([{ name: m.name, uri: m.uri, folders }]);
    } catch { onPick([m.name]); } finally { setBusy(false); }
  };

  const tapFolder = async (f: SubFolder) => {
    setBusy(true); setNewMode(false); setNewErr('');
    try {
      const folders = (await listFolder(f.uri)).folders;
      setStack((s) => [...s, { name: f.name, uri: f.uri, folders }]);
    } catch {
      setStack((s) => [...s, { name: f.name, uri: f.uri, folders: [] }]);
    } finally { setBusy(false); }
  };

  const back = () => { setNewMode(false); setNewErr(''); setStack((s) => s.slice(0, -1)); };

  const createNew = async () => {
    if (!cur) return;
    const r = validateFolderName(newName);
    if (!r.ok) { setNewErr(r.error); return; }
    if (cur.folders.some((f) => f.name === r.value)) { setNewErr('Đã tồn tại'); return; }
    setBusy(true);
    try {
      await createSubfolder(cur.uri, r.value); // tạo folder ngay (M6c) — không đợi worker
      onPick([...path, r.value]);              // chọn nó làm đích luôn
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setNewErr(msg.includes('exists') ? 'Đã tồn tại' : (msg || 'Lỗi tạo thư mục'));
      setBusy(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onCancel}
      breakpoints={[0, 0.92]} initialBreakpoint={0.92} expandToScroll={false}>
      <IonHeader>
        <IonToolbar>
          {!atRoot && (
            <IonButtons slot="start">
              <IonButton onClick={back} aria-label="Quay lại"><IonIcon slot="icon-only" icon={arrowBack} /></IonButton>
            </IonButtons>
          )}
          <IonTitle className="gu-title" style={{ fontSize: 17 }}>
            {atRoot ? 'Lưu vào môn nào?' : `Lưu vào đâu trong ${cur?.name}?`}
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {note && <IonNote>{note}</IonNote>}
        {busy && <div style={{ textAlign: 'center', padding: 12 }}><IonSpinner /></div>}

        <IonList style={{ background: 'transparent' }}>
          {atRoot ? (
            <>
              {ordered.map((m) => (
                <div key={m.uri} style={{ marginBottom: 10 }}>
                  <IonItem button detail={false} lines="none" disabled={busy} onClick={() => tapMon(m)} style={card}>
                    <MonSwatch name={m.name} color={m.meta.color} icon={m.meta.icon} />
                    <IonLabel className="gu-serif" style={{ marginLeft: 12 }}>
                      {m.name}{m.name === last ? '  · vừa dùng' : ''}
                    </IonLabel>
                  </IonItem>
                </div>
              ))}
              {/* "Chưa phân loại": luôn phẳng, không drill / không tạo con */}
              <div style={{ marginBottom: 10 }}>
                <IonItem button detail={false} lines="none" disabled={busy} onClick={() => onPick([UNFILED])} style={card}>
                  <UnfiledSwatch />
                  <IonLabel color="medium" style={{ marginLeft: 12, fontStyle: 'italic' }}>Chưa phân loại</IonLabel>
                </IonItem>
              </div>
            </>
          ) : (
            <>
              {/* Lưu vào cấp hiện tại (Gốc môn / thư mục đang đứng) */}
              <div style={{ marginBottom: 10 }}>
                <IonItem button detail={false} lines="none" disabled={busy} onClick={() => onPick(path)} style={card}>
                  <IonIcon icon={checkmarkCircleOutline} style={{ color: 'var(--gu-brown)', marginRight: 12 }} />
                  <IonLabel className="gu-serif">Lưu vào “{cur?.name}”</IonLabel>
                </IonItem>
              </div>
              {/* Thư mục con → drill tiếp */}
              {cur?.folders.map((f) => (
                <div key={f.uri} style={{ marginBottom: 10 }}>
                  <IonItem button detail={false} lines="none" disabled={busy} onClick={() => tapFolder(f)} style={card}>
                    <IonIcon icon={folderOutline} style={{ color: 'var(--gu-brown)', marginRight: 12 }} />
                    <IonLabel className="gu-serif">{f.name}</IonLabel>
                  </IonItem>
                </div>
              ))}
              {/* + Thư mục mới (inline — không sheet chồng sheet) */}
              {newMode ? (
                <div style={{ background: 'var(--gu-paper-2)', borderRadius: 14, padding: 12, marginBottom: 10 }}>
                  <IonInput value={newName} placeholder="Tên thư mục mới…" disabled={busy}
                    onIonInput={(e) => { setNewName(String(e.detail.value ?? '')); setNewErr(''); }}
                    style={{ border: '1px solid var(--ion-color-medium)', borderRadius: 8, padding: '4px 8px' }} />
                  {newErr && <p style={{ color: 'var(--ion-color-danger)', fontSize: 13, margin: '6px 0 0' }}>{newErr}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <IonButton size="small" fill="clear" disabled={busy} onClick={() => { setNewMode(false); setNewErr(''); }}>Huỷ</IonButton>
                    <IonButton size="small" shape="round" disabled={busy} onClick={createNew}>Tạo &amp; lưu</IonButton>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 10 }}>
                  <IonItem button detail={false} lines="none" disabled={busy}
                    onClick={() => { setNewMode(true); setNewName(''); setNewErr(''); }} style={card}>
                    <IonIcon icon={addCircleOutline} style={{ color: 'var(--gu-brown)', marginRight: 12 }} />
                    <IonLabel className="gu-serif">+ Thư mục mới</IonLabel>
                  </IonItem>
                </div>
              )}
            </>
          )}
        </IonList>
      </IonContent>
    </IonModal>
  );
}
