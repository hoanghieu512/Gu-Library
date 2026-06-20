import { useEffect, useState } from 'react';
import { IonPage, IonContent, IonButton, IonInput, IonItem } from '@ionic/react';
import { Document, Page, pdfjs } from 'react-pdf';
import { getRootUri, listFolder } from '../storage/repo';
import { Saf } from '../plugins/saf';
import { base64ToBytes } from '../storage/bytes';

// Worker offline (bundle, không CDN).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url,
).toString();

export default function ViewerSpike() {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [target, setTarget] = useState('1');
  const [err, setErr] = useState('');

  // Lấy đại PDF đầu tiên tìm được trong kho để thử.
  useEffect(() => {
    (async () => {
      try {
        const root = await getRootUri();
        if (!root) { setErr('chưa chọn kho'); return; }
        // tìm pdf đầu tiên: duyệt môn cấp 1 -> listFolder -> documents[0]
        const top = await listFolder(root);
        let pdfUri: string | null = null;
        for (const f of top.folders) {
          const l = await listFolder(f.uri);
          if (l.documents[0]) { pdfUri = l.documents[0].pdfUri; break; }
          for (const sf of l.folders) {
            const l2 = await listFolder(sf.uri);
            if (l2.documents[0]) { pdfUri = l2.documents[0].pdfUri; break; }
          }
          if (pdfUri) break;
        }
        if (!pdfUri) { setErr('không thấy PDF nào trong kho'); return; }
        const { data } = await Saf.readFileBase64({ uri: pdfUri });
        setBytes(base64ToBytes(data));
      } catch (e: any) { setErr(String(e?.message ?? e)); }
    })();
  }, []);

  const jump = () => {
    const n = parseInt(target, 10);
    document.getElementById(`spike-page-${n}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <IonPage>
      <IonContent>
        {err && <p style={{ color: 'red' }}>Lỗi: {err}</p>}
        <IonItem>
          <IonInput value={target} onIonInput={(e) => setTarget(e.detail.value ?? '1')} />
          <IonButton onClick={jump}>Nhảy trang</IonButton>
          <span>/ {numPages}</span>
        </IonItem>
        {bytes && (
          <Document file={{ data: bytes }} onLoadSuccess={(d) => setNumPages(d.numPages)} onLoadError={(e) => setErr(e.message)}>
            {Array.from({ length: numPages }, (_, i) => (
              <div id={`spike-page-${i + 1}`} key={i}>
                <Page pageNumber={i + 1} width={Math.min(window.innerWidth, 800)} />
              </div>
            ))}
          </Document>
        )}
      </IonContent>
    </IonPage>
  );
}
