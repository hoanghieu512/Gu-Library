import { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { bookOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import type { Progress } from '../reading/progress';
import { encodeUriParam } from '../storage/uriParam';
import { getRootUri } from '../storage/repo';
import { monNameFromUris } from '../storage/monPath';

export default function ContinueReadingCard({ progress }: { progress: Progress }) {
  const history = useHistory();
  const pct = progress.total > 0 ? Math.round((progress.page / progress.total) * 100) : 0;

  // Suy tên môn tươi từ docUri lúc render (không phụ thuộc monName đã lưu — có thể cũ).
  const [monName, setMonName] = useState(progress.monName);
  useEffect(() => {
    let alive = true;
    getRootUri().then((root) => {
      if (!alive) return;
      const derived = root ? monNameFromUris(root, progress.docUri) : '';
      if (derived) setMonName(derived);
    });
    return () => { alive = false; };
  }, [progress.docUri]);
  return (
    <div
      onClick={() => history.push(`/viewer/${encodeUriParam(progress.docUri)}`)}
      style={{
        background: 'var(--gu-brown-deep)', color: '#fff', borderRadius: 16,
        padding: 16, margin: '12px 0', display: 'flex', gap: 14, cursor: 'pointer',
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 10, background: 'rgba(255,255,255,.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
      }}>
        <IonIcon icon={bookOutline} style={{ fontSize: 28 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 17 }}>{progress.name}</div>
        <div style={{ opacity: .8, fontSize: 13 }}>{monName}</div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.25)', margin: '8px 0 4px' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#fff' }} />
        </div>
        <div style={{ fontSize: 12, opacity: .85 }}>Trang {progress.page} / {progress.total} · chạm để đọc tiếp</div>
      </div>
    </div>
  );
}
