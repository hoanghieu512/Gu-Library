import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { IonPopover, IonList, IonItem, IonLabel } from '@ionic/react';

export interface Crumb { name: string; uri: string; }

// Header bấm-nhảy-tầng (v1.20.0). Mỗi tầng cha = vùng chạm nhảy LÊN thẳng thư mục đó; tầng cuối
// (đang đứng) KHÔNG bấm. Giữ ĐÚNG quy tắc rút gọn folderHeaderTitle v1.15.0: 1 tầng = tên môn;
// 2 tầng = "Môn / Thư mục"; ≥3 tầng = "… / Cha / Hiện tại", trong đó `…` bấm mở danh sách các tầng
// cha bị nuốt (đủ + đúng thứ tự, KỂ CẢ tầng môn). CHỈ nhảy lên — không dropdown con, không nhảy ngang.
const HIT: CSSProperties = { minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 4px' };
const SHRINK: CSSProperties = { flex: '0 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

export default function HeaderBreadcrumb({ crumbs, onJump }: { crumbs: Crumb[]; onJump: (uri: string) => void }) {
  const [popEvent, setPopEvent] = useState<Event | undefined>(undefined);

  if (crumbs.length === 0) return <span>Môn / Chương</span>;

  const sep = (k: string) => <span key={k} style={{ opacity: 0.45, flex: '0 0 auto', padding: '0 1px' }}>/</span>;
  const last = crumbs[crumbs.length - 1];
  const plain = (c: Crumb, k: string) => <span key={k} style={{ ...HIT, ...SHRINK }}>{c.name}</span>;
  const link = (c: Crumb, k: string) => (
    c.uri
      ? <span key={k} role="button" onClick={() => onJump(c.uri)} style={{ ...HIT, ...SHRINK, cursor: 'pointer' }}>{c.name}</span>
      : plain(c, k) // uri chưa resolve (snapshot stale) → hiện chữ, không bấm
  );

  let row: ReactNode[];
  if (crumbs.length === 1) {
    row = [plain(last, 'cur')];
  } else if (crumbs.length === 2) {
    row = [link(crumbs[0], 'c0'), sep('s0'), plain(last, 'cur')];
  } else {
    // ≥3: … / Cha / Hiện tại. `…` nuốt crumbs[0 .. length-3] (gồm cả môn).
    const parent = crumbs[crumbs.length - 2];
    row = [
      <span key="ell" role="button" onClick={(e) => setPopEvent(e.nativeEvent)} style={{ ...HIT, flex: '0 0 auto', cursor: 'pointer' }}>…</span>,
      sep('s0'), link(parent, 'par'), sep('s1'), plain(last, 'cur'),
    ];
  }

  const hidden = crumbs.slice(0, crumbs.length - 2); // các tầng cha bị `…` nuốt, đúng thứ tự

  return (
    <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', maxWidth: '100%' }}>
      {row}
      <IonPopover isOpen={!!popEvent} event={popEvent} onDidDismiss={() => setPopEvent(undefined)}>
        <IonList>
          {hidden.map((c) => (
            <IonItem key={c.uri} button detail={false} onClick={() => { setPopEvent(undefined); onJump(c.uri); }}>
              <IonLabel>{c.name}</IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonPopover>
    </div>
  );
}
