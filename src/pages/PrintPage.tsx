import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent,
  IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonLabel, IonBadge, IonButton, IonFooter,
} from '@ionic/react';
import { App } from '@capacitor/app';
import { listPrintRows, gomToPrint, markPrinted, clearPrintFlag, type PrintRow } from '../print/printRepo';
import { onKhoChanged } from '../lib/khoEvents';

export default function PrintPage() {
  const [rows, setRows] = useState<PrintRow[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    listPrintRows().then(setRows).catch(() => setRows([]));
  }, []);

  useEffect(() => {
    reload();
    const off = onKhoChanged(() => reload());
    const sub = App.addListener('resume', () => reload());
    return () => { off(); sub.then((h) => h.remove()); };
  }, [reload]);

  // Gom theo môn, giữ thứ tự xuất hiện.
  const byMon = new Map<string, PrintRow[]>();
  for (const r of rows) {
    const arr = byMon.get(r.monName) ?? [];
    arr.push(r);
    byMon.set(r.monName, arr);
  }

  const pendingCopy = rows.filter((r) => !r.sent).length;

  const doGom = async () => {
    setBusy(true);
    try { await gomToPrint(); reload(); } finally { setBusy(false); }
  };

  const doDone = async (row: PrintRow) => {
    setBusy(true);
    try { await markPrinted(row); reload(); } finally { setBusy(false); }
  };

  // Vuốt để bỏ "cần in" (chỉ dòng chưa gom): xóa companion, khỏi cần ra môn untick.
  const doRemove = async (row: PrintRow) => {
    setBusy(true);
    try { await clearPrintFlag(row.pdfUri); reload(); } finally { setBusy(false); }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
          <IonTitle className="gu-title">Đi in</IonTitle>
        </IonToolbar>
      </IonHeader>
      {/* Padding NGANG ở content; padding DỌC nằm trong từng header (h2) → dải nền header
          đồng đều mọi nhóm (nhóm đầu không còn mỏng hơn do padding-top của content). */}
      <IonContent style={{ '--padding-start': '16px', '--padding-end': '16px' } as CSSProperties}>
        {rows.length === 0 && (
          <p style={{ color: 'var(--gu-grey)', paddingTop: 16 }}>Chưa có tài liệu nào cần in.</p>
        )}
        {[...byMon.entries()].map(([mon, list]) => (
          <div key={mon} className="print-group">
            <h2 className="gu-title" style={{ fontSize: 16, margin: 0, paddingTop: 12, paddingBottom: 6, paddingInlineStart: 16, color: 'var(--gu-brown)' }}>{mon}</h2>
            {/* Mỗi tài liệu = thẻ-rời bo góc (giống sheet "Đang đọc dở"); bo góc + overflow ở div bọc
                để nút "Bỏ" vuốt liền khối với thẻ. */}
            <IonList style={{ background: 'transparent', paddingTop: 0, paddingBottom: 0 }}>
              {list.map((r) => (
                <div key={r.pdfUri} style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden' }}>
                  {r.sent ? (
                    <IonItem
                      lines="none"
                      style={{ '--background': 'var(--gu-paper-2)', '--border-radius': '0', '--padding-top': '10px', '--padding-bottom': '10px' } as CSSProperties}
                    >
                      <IonLabel className="gu-serif">{r.name}</IonLabel>
                      <IonBadge slot="end" color="success" style={{ marginRight: 8 }}>Đã gửi đi in</IonBadge>
                      <IonButton slot="end" size="small" fill="clear" disabled={busy} onClick={() => doDone(r)}>
                        Xong
                      </IonButton>
                    </IonItem>
                  ) : (
                    <IonItemSliding>
                      <IonItem
                        lines="none"
                        style={{ '--background': 'var(--gu-paper-2)', '--border-radius': '0', '--padding-top': '10px', '--padding-bottom': '10px' } as CSSProperties}
                      >
                        <IonLabel className="gu-serif">{r.name}</IonLabel>
                      </IonItem>
                      <IonItemOptions side="end">
                        <IonItemOption color="danger" disabled={busy} onClick={() => doRemove(r)}>
                          Bỏ
                        </IonItemOption>
                      </IonItemOptions>
                    </IonItemSliding>
                  )}
                </div>
              ))}
            </IonList>
          </div>
        ))}
      </IonContent>
      {pendingCopy > 0 && (
        <IonFooter>
          <IonToolbar>
            <div style={{ padding: '0 12px' }}>
              <IonButton expand="block" shape="round" disabled={busy} onClick={doGom}>
                {busy ? 'Đang gom…' : `Gom để in (${pendingCopy})`}
              </IonButton>
            </div>
          </IonToolbar>
        </IonFooter>
      )}
    </IonPage>
  );
}
