import { useEffect, useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import { folderOutline, documentTextOutline, arrowBackOutline, chevronForward } from 'ionicons/icons';
import { getKhoSnapshot } from '../storage/khoSnapshot';
import type { KhoSnapshot, KhoFolder } from '../storage/khoSnapshot';
import MonSwatch from './MonSwatch';
import UnfiledSwatch from './UnfiledSwatch';
import { UNFILED } from '../import/prefix';

// Duyệt kho chọn MỘT tài liệu cho pane tra cứu (split-screen v1.27.0). Dùng CÂY `khoSnapshot` có sẵn
// trong RAM (KHÔNG gọi SAF mới, KHÔNG đẻ route điều hướng mới): danh sách môn → thư mục con + tài
// liệu → chạm tài liệu = onPick(uri). Drill trong tree, ở lại trong split. Không đụng reading-state.
export default function DocPicker({ onPick }: { onPick: (uri: string) => void }) {
  const [snap, setSnap] = useState<KhoSnapshot | null>(null);
  const [path, setPath] = useState<KhoFolder[]>([]); // rỗng = danh sách môn; cuối = thư mục hiện tại

  useEffect(() => { getKhoSnapshot().then(setSnap).catch(() => setSnap(null)); }, []);

  if (!snap) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 24 }}><IonSpinner name="crescent" /></div>;
  }

  const cur = path[path.length - 1] ?? null;
  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
    borderBottom: '1px solid var(--gu-paper-2)', cursor: 'pointer',
  };
  const displayOf = (folder: KhoFolder, fileBase: string) => folder.displayNames.get(fileBase) ?? fileBase;

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--gu-white)' }}>
      {/* Thanh vị trí + back */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 1, display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', background: 'var(--gu-cream)', borderBottom: '1px solid var(--gu-paper-2)',
      }}>
        {cur ? (
          <button onClick={() => setPath(path.slice(0, -1))} aria-label="Lên trên"
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 0, color: 'var(--gu-brown)', fontSize: 14 }}>
            <IonIcon icon={arrowBackOutline} /> {cur.name}
          </button>
        ) : (
          <span style={{ fontSize: 14, color: 'var(--gu-brown-deep)', fontWeight: 700 }}>Chọn tài liệu để tra cứu</span>
        )}
      </div>

      {/* Danh sách môn (gốc) */}
      {!cur && snap.mons.map((m) => {
        const folder = snap.monFolders.get(m.uri);
        if (!folder) return null;
        return (
          <div key={m.uri} style={rowStyle} onClick={() => setPath([folder])}>
            {m.name === UNFILED ? <UnfiledSwatch /> : <MonSwatch name={m.name} color={m.meta.color} />}
            <span style={{ flex: 1, fontFamily: 'var(--gu-serif)', fontWeight: 700, color: 'var(--gu-brown-deep)' }}>{m.name}</span>
            <IonIcon icon={chevronForward} style={{ color: 'var(--gu-grey)' }} />
          </div>
        );
      })}

      {/* Trong một thư mục: thư mục con + tài liệu */}
      {cur && (
        <>
          {cur.children.map((c) => (
            <div key={c.uri} style={rowStyle} onClick={() => setPath([...path, c])}>
              <IonIcon icon={folderOutline} style={{ fontSize: 22, color: 'var(--gu-brown)' }} />
              <span style={{ flex: 1, color: 'var(--gu-brown-deep)' }}>{c.name}</span>
              <IonIcon icon={chevronForward} style={{ color: 'var(--gu-grey)' }} />
            </div>
          ))}
          {cur.listing.documents.map((d) => (
            <div key={d.pdfUri} style={rowStyle} onClick={() => onPick(d.pdfUri)}>
              <IonIcon icon={documentTextOutline} style={{ fontSize: 22, color: 'var(--gu-grey)' }} />
              <span style={{ flex: 1, color: 'var(--gu-brown-deep)' }}>{displayOf(cur, d.fileBase ?? d.name)}</span>
            </div>
          ))}
          {cur.children.length === 0 && cur.listing.documents.length === 0 && (
            <p style={{ padding: 16, color: 'var(--gu-grey)', fontSize: 13 }}>Thư mục trống.</p>
          )}
        </>
      )}
    </div>
  );
}
