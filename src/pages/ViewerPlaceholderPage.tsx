import { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent,
  IonButton, IonText,
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { setProgress, getProgressFor } from '../reading/progress';
import { getRootUri } from '../storage/repo';
import { decodeUriParam } from '../storage/uriParam';
import { monNameFromUris } from '../storage/monPath';

const TOTAL = 10; // giả lập — M5 lấy số trang thật từ PDF

function baseName(contentUri: string): string {
  // content-URI: .../document/primary%3ADownload%2Fkho%2Fslide-buoi-2.pdf
  const decoded = decodeURIComponent(contentUri); // %2F -> /, %3A -> :
  const last = decoded.split('/').pop() ?? decoded;
  return last.replace(/\.[^.]+$/, '');
}

export default function ViewerPlaceholderPage() {
  const { uri } = useParams<{ uri: string }>();
  const docUri = decodeUriParam(uri);
  const name = baseName(docUri);
  // page = null khi đang nạp tiến độ đã lưu (để khôi phục đúng trang đang đọc dở).
  const [page, setPage] = useState<number | null>(null);
  const [monName, setMonName] = useState('Tài liệu');

  // Nạp trang đã lưu + suy tên môn của tài liệu này.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [prog, root] = await Promise.all([getProgressFor(docUri), getRootUri()]);
      if (!alive) return;
      setPage(prog?.page ?? 1);
      const mn = (root && monNameFromUris(root, docUri)) || prog?.monName || 'Tài liệu';
      setMonName(mn);
    })();
    return () => { alive = false; };
  }, [docUri]);

  // Ghi tiến độ mỗi khi đổi trang (M5 thay placeholder này bằng PDF thật).
  useEffect(() => {
    if (page == null) return;
    setProgress({ docUri, name, monName, page, total: TOTAL });
  }, [docUri, name, monName, page]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
          <IonTitle className="gu-title">{name}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonText><p>Viewer thật là M5. Đây là placeholder để chạy vòng "đang đọc dở".</p></IonText>
        {page == null ? <p>Đang tải…</p> : (
          <>
            <p>Trang {page} / {TOTAL}</p>
            <IonButton disabled={page <= 1} onClick={() => setPage((p) => (p ?? 1) - 1)}>Trang trước</IonButton>
            <IonButton disabled={page >= TOTAL} onClick={() => setPage((p) => (p ?? 1) + 1)}>Trang sau</IonButton>
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
