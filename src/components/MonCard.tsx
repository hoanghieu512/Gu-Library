import { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { chevronForward, hourglassOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import MonSwatch from './MonSwatch';
import type { Mon } from '../storage/types';
import { summarizeMon, type MonSummary } from '../storage/summary';
import { encodeUriParam } from '../storage/uriParam';

export default function MonCard({ mon, inboxPending = 0 }: { mon: Mon; inboxPending?: number }) {
  const history = useHistory();
  const [sum, setSum] = useState<MonSummary | null>(null);
  useEffect(() => { summarizeMon(mon.uri).then(setSum).catch(() => setSum({ documents: 0, pending: 0 })); }, [mon.uri]);

  const pending = (sum?.pending ?? 0) + (inboxPending ?? 0);

  return (
    <div
      onClick={() => history.push(`/folder/${encodeUriParam(mon.uri)}`)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gu-paper-2)',
        borderRadius: 12, padding: 12, margin: '8px 0', cursor: 'pointer',
      }}
    >
      <MonSwatch name={mon.name} color={mon.meta.color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, color: 'var(--gu-brown-deep)' }}>{mon.name}</div>
        <div style={{ fontSize: 13, color: 'var(--gu-grey)' }}>
          {sum ? `${sum.documents} tài liệu` : 'Đang đếm…'}
        </div>
      </div>
      {pending > 0 && (
        <span style={{
          background: 'var(--gu-pending)', color: '#fff', borderRadius: 999,
          padding: '2px 10px', fontSize: 12, whiteSpace: 'nowrap',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <IonIcon icon={hourglassOutline} style={{ fontSize: 13 }} />
          {pending} chờ
        </span>
      )}
      <IonIcon icon={chevronForward} style={{ color: 'var(--gu-grey)' }} />
    </div>
  );
}
