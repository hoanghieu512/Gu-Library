import { useEffect, useMemo, useState } from 'react';
import { IonPage, IonContent, IonButton, IonInput, IonItem } from '@ionic/react';
import { Document, Page, pdfjs } from 'react-pdf';
import { getRootUri, listFolder } from '../storage/repo';
import { Saf } from '../plugins/saf';
import { base64ToBytes } from '../storage/bytes';

// Worker offline (bundle, không CDN).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url,
).toString();

// Gom mọi URI .pdf trong kho (cả documents lẫn pending = pdf lẻ chưa có sidecar),
// duyệt tối đa 2 tầng — đủ cho spike.
async function collectPdfUris(): Promise<string[]> {
  const root = await getRootUri();
  if (!root) return [];
  const out: string[] = [];
  const push = (l: { documents: { pdfUri: string }[]; pending: { ext: string; sourceUri: string }[] }) => {
    l.documents.forEach((d) => out.push(d.pdfUri));
    l.pending.filter((p) => p.ext === 'pdf').forEach((p) => out.push(p.sourceUri));
  };
  const top = await listFolder(root);
  for (const f of top.folders) {
    const l = await listFolder(f.uri);
    push(l);
    for (const sf of l.folders) push(await listFolder(sf.uri));
  }
  return out;
}

export default function ViewerSpike() {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [target, setTarget] = useState('1');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  // Chọn PDF LỚN NHẤT (bỏ qua stub fixture ~20 byte) trong các ứng viên.
  useEffect(() => {
    (async () => {
      try {
        const uris = await collectPdfUris();
        if (uris.length === 0) { setErr('không thấy PDF nào trong kho'); return; }
        let best: Uint8Array | null = null;
        for (const u of uris) {
          const { data } = await Saf.readFileBase64({ uri: u });
          const b = base64ToBytes(data);
          if (!best || b.length > best.length) best = b;
        }
        if (!best || best.length < 1024) {
          setErr(`PDF tìm thấy quá nhỏ (${best?.length ?? 0}B) — có thể là file stub, hãy chép 1 PDF thật vào môn.`);
          return;
        }
        setInfo(`PDF ${(best.length / 1024).toFixed(0)} KB`);
        setBytes(best);
      } catch (e: any) { setErr(String(e?.message ?? e)); }
    })();
  }, []);

  // QUAN TRỌNG: memo + COPY buffer. pdf.js transfer ArrayBuffer sang worker (detach),
  // nếu truyền inline {data:bytes} sẽ reload trên buffer đã detach -> lỗi.
  const file = useMemo(() => (bytes ? { data: bytes.slice(0) } : null), [bytes]);

  const jump = () => {
    const n = parseInt(target, 10);
    document.getElementById(`spike-page-${n}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <IonPage>
      <IonContent>
        {err && <p style={{ color: 'red' }}>Lỗi: {err}</p>}
        {info && <p style={{ color: 'green' }}>{info}</p>}
        <IonItem>
          <IonInput value={target} onIonInput={(e) => setTarget(e.detail.value ?? '1')} />
          <IonButton onClick={jump}>Nhảy trang</IonButton>
          <span>/ {numPages}</span>
        </IonItem>
        {file && (
          <Document file={file} onLoadSuccess={(d) => setNumPages(d.numPages)} onLoadError={(e) => setErr(e.message)}>
            {Array.from({ length: numPages }, (_, i) => (
              <div id={`spike-page-${i + 1}`} key={i}>
                <Page pageNumber={i + 1} width={Math.min(window.innerWidth, 800)} renderTextLayer={false} renderAnnotationLayer={false} />
              </div>
            ))}
          </Document>
        )}
      </IonContent>
    </IonPage>
  );
}
