import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent,
  IonButton, IonFooter,
} from '@ionic/react';
import { trash } from 'ionicons/icons';
import { App } from '@capacitor/app';
import { listPrintRows, gomToPrint, markPrinted, clearPrintFlag, type PrintRow } from '../print/printRepo';
import { onKhoChanged } from '../lib/khoEvents';
import { listMon } from '../storage/repo';
import KhoRow, { StatusPill } from '../components/KhoRow';
import MonSwatch from '../components/MonSwatch';

export default function PrintPage() {
  const [rows, setRows] = useState<PrintRow[]>([]);
  const [busy, setBusy] = useState(false);
  // Màu môn cho swatch ở header nhóm — ĐỌC từ `_mon.json` (cùng nguồn màu gáy kệ Home), không
  // suy từ tên: môn Gú đã gán màu phải ra ĐÚNG màu đó. Lỗi đọc → bỏ swatch, không chặn màn.
  const [monColors, setMonColors] = useState<Map<string, string | undefined>>(new Map());

  const reload = useCallback(() => {
    listPrintRows().then(setRows).catch(() => setRows([]));
    listMon()
      .then((ms) => setMonColors(new Map(ms.map((m) => [m.name, m.meta.color] as const))))
      .catch(() => { /* giữ map cũ */ });
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
  // KHÔNG xóa file thật — giữ nguyên hành vi có từ v0.10.0, beat B1 chỉ đổi HÌNH (icon thùng
  // rác đỏ thay chữ "Bỏ"), không đổi việc nó làm.
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
      <IonContent style={{ '--padding-start': '16px', '--padding-end': '16px', '--padding-bottom': '16px' } as CSSProperties}>
        {rows.length === 0 && (
          <p style={{ color: 'var(--gu-grey)', paddingTop: 16 }}>Chưa có tài liệu nào cần in.</p>
        )}
        {[...byMon.entries()].map(([mon, list]) => (
          <div key={mon} className="print-group">
            {/* Header nhóm môn: swatch màu môn + tên serif → nhận ra môn bằng MÀU như ở kệ Home */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, paddingBottom: 6, paddingInlineStart: 16 }}>
              <MonSwatch name={mon} color={monColors.get(mon)} size={18} />
              <h2 className="gu-title" style={{ fontSize: 16, margin: 0, color: 'var(--gu-brown)' }}>{mon}</h2>
            </div>
            {list.map((r) => (
              r.sent ? (
                <KhoRow
                  key={r.pdfUri}
                  title={r.name}
                  trailing={
                    <>
                      <StatusPill text="Đã gửi đi in" />
                      <IonButton size="small" fill="clear" disabled={busy} onClick={() => doDone(r)}>Xong</IonButton>
                    </>
                  }
                />
              ) : (
                <KhoRow
                  key={r.pdfUri}
                  title={r.name}
                  actions={[{
                    key: 'remove', icon: trash, tone: 'danger',
                    label: 'Bỏ cần in', disabled: busy, onClick: () => doRemove(r),
                  }]}
                />
              )
            ))}
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
