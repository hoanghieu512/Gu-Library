import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { IonIcon, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonLabel } from '@ionic/react';
import { chevronForward, hourglassOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import MonSwatch from './MonSwatch';
import UnfiledSwatch from './UnfiledSwatch';
import type { Mon } from '../storage/types';
import { summarizeMon, type MonSummary } from '../storage/summary';
import { encodeUriParam } from '../storage/uriParam';
import { UNFILED } from '../import/prefix';

const renameOpt: CSSProperties = { '--background': 'var(--gu-brown)', '--color': '#fff' } as CSSProperties;
// IonItem VUÔNG góc (--border-radius:0); div bọc ngoài mới bo góc + overflow:hidden → thẻ và nút
// vuốt liền một khối, cùng cắt theo góc bo (như ReadingListSheet) → trượt qua không hở góc.
const card: CSSProperties = {
  '--background': 'var(--gu-paper-2)', '--border-radius': '0', '--padding-start': '12px',
  '--inner-padding-end': '12px', '--min-height': '64px',
} as CSSProperties;

// Hàng môn (Home): chạm mở, VUỐT TRÁI → "Đổi tên" (v1.22.0, cùng ngôn ngữ vuốt v1.5.0).
// "Chưa phân loại" không truyền onRename → không có action (worker phụ thuộc, phẳng vĩnh viễn).
export default function MonCard({
  mon, inboxPending = 0, refreshKey = 0, onRename, onDelete,
}: { mon: Mon; inboxPending?: number; refreshKey?: number; onRename?: () => void; onDelete?: () => void }) {
  const history = useHistory();
  const [sum, setSum] = useState<MonSummary | null>(null);
  const slideRef = useRef<HTMLIonItemSlidingElement>(null);
  useEffect(() => { summarizeMon(mon.uri).then(setSum).catch(() => setSum({ documents: 0, pending: 0 })); }, [mon.uri, refreshKey]);

  const pending = (sum?.pending ?? 0) + (inboxPending ?? 0);
  const open = () => history.push(`/folder/${encodeUriParam(mon.uri)}`);

  return (
    <div style={{ margin: '8px 0', borderRadius: 12, overflow: 'hidden' }}>
      <IonItemSliding ref={slideRef}>
      <IonItem button detail={false} lines="none" onClick={open} style={card}>
        <div slot="start" style={{ display: 'flex', alignItems: 'center', marginInlineEnd: 12 }}>
          {mon.name === UNFILED ? <UnfiledSwatch /> : <MonSwatch name={mon.name} color={mon.meta.color} />}
        </div>
        <IonLabel>
          {mon.name === UNFILED
            ? <div style={{ fontStyle: 'italic', color: 'var(--gu-grey)' }}>{mon.name}</div>
            : <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, color: 'var(--gu-brown-deep)' }}>{mon.name}</div>}
          <div style={{ fontSize: 13, color: 'var(--gu-grey)' }}>
            {sum ? `${sum.documents} tài liệu` : 'Đang đếm…'}
          </div>
        </IonLabel>
        {pending > 0 && (
          <span slot="end" style={{
            background: 'var(--gu-pending)', color: '#fff', borderRadius: 999,
            padding: '2px 10px', fontSize: 12, whiteSpace: 'nowrap',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <IonIcon icon={hourglassOutline} style={{ fontSize: 13 }} />
            {pending} chờ
          </span>
        )}
        <IonIcon slot="end" icon={chevronForward} style={{ color: 'var(--gu-grey)', marginInlineStart: 8 }} />
      </IonItem>
      {(onRename || onDelete) && (
        <IonItemOptions side="end">
          {onRename && (
            <IonItemOption style={renameOpt} onClick={() => { slideRef.current?.close(); onRename(); }} aria-label="Đổi tên">
              Đổi tên
            </IonItemOption>
          )}
          {onDelete && (
            <IonItemOption color="danger" onClick={() => { slideRef.current?.close(); onDelete(); }} aria-label="Xóa">
              Xóa
            </IonItemOption>
          )}
        </IonItemOptions>
      )}
      </IonItemSliding>
    </div>
  );
}
