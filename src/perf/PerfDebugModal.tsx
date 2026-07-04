import { useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon,
  useIonToast,
} from '@ionic/react';
import { close, copyOutline, refreshOutline, trashOutline } from 'ionicons/icons';
import { perfStats, perfReportText, perfReset, type FlowStat } from './perf';

// Ghi text vào clipboard; fallback textarea+execCommand cho WebView cũ. Trả về đã copy được chưa.
async function writeClipboard(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* thử fallback */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

// Màn debug: bảng số đo phiên + copy text + reset. Mặc định KHÔNG đo gì tự động ngoài các
// mark đã gắn — mở màn này chỉ đọc snapshot in-memory, không kích hoạt luồng nào.
export default function PerfDebugModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<FlowStat[]>([]);
  const [presentToast] = useIonToast();
  const version = __APP_VERSION__;
  const mode = import.meta.env.MODE;

  const reload = () => setRows(perfStats());

  const copy = async () => {
    const done = await writeClipboard(perfReportText({ version, mode }));
    await presentToast({ message: done ? 'Đã copy bảng số đo' : 'Không copy được — chọn tay ở khung dưới', duration: 2000 });
  };

  const reset = () => { perfReset(); reload(); };
  const r = (n: number) => Math.round(n);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} onDidPresent={reload}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Đo hiệu năng</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} aria-label="Đóng"><IonIcon slot="icon-only" icon={close} /></IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p style={{ fontSize: 12, color: 'var(--gu-grey)', marginTop: 0 }}>
          Số đo phiên (ms). <b>Chỉ có nghĩa trên máy thật / release</b> — số ở web/dev không so được.
          Neo “xong” = nội dung vẽ xong trên màn; các mốc “mở” không gồm hoạt ảnh chuyển trang,
          “khởi động” không gồm phần native trước WebView.
        </p>

        <div style={{ display: 'flex', gap: 8, margin: '8px 0 12px' }}>
          <IonButton size="small" fill="solid" style={{ textTransform: 'none' }} onClick={copy}>
            <IonIcon slot="start" icon={copyOutline} /> Copy text
          </IonButton>
          <IonButton size="small" fill="outline" style={{ textTransform: 'none' }} onClick={reload}>
            <IonIcon slot="start" icon={refreshOutline} /> Làm mới
          </IonButton>
          <IonButton size="small" fill="clear" color="danger" style={{ textTransform: 'none' }} onClick={reset}>
            <IonIcon slot="start" icon={trashOutline} /> Reset
          </IonButton>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: 'var(--gu-brown-deep)', textAlign: 'right' }}>
              <th style={{ textAlign: 'left', padding: '4px 6px' }}>Luồng</th>
              <th style={{ padding: '4px 6px' }}>gần</th>
              <th style={{ padding: '4px 6px' }}>min</th>
              <th style={{ padding: '4px 6px' }}>med</th>
              <th style={{ padding: '4px 6px' }}>max</th>
              <th style={{ padding: '4px 6px' }}>n</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.flow} style={{ borderTop: '1px solid var(--gu-paper-2)', textAlign: 'right' }}>
                <td style={{ textAlign: 'left', padding: '6px', fontFamily: 'var(--gu-serif)' }}>{s.label}</td>
                {s.count === 0
                  ? <td colSpan={5} style={{ padding: '6px', color: 'var(--gu-grey)' }}>chưa đo</td>
                  : <>
                      <td style={{ padding: '6px', fontWeight: 700 }}>{r(s.last)}</td>
                      <td style={{ padding: '6px' }}>{r(s.min)}</td>
                      <td style={{ padding: '6px' }}>{r(s.median)}</td>
                      <td style={{ padding: '6px' }}>{r(s.max)}</td>
                      <td style={{ padding: '6px', color: 'var(--gu-grey)' }}>{s.count}</td>
                    </>}
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: 11, color: 'var(--gu-grey)', marginTop: 16 }}>
          Phiên bản {version} · build {mode}
        </p>
      </IonContent>
    </IonModal>
  );
}
