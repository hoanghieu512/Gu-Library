import { IonIcon } from '@ionic/react';
import { bookOutline, arrowForward } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import type { ReadingItem } from '../reading/store';
import { encodeUriParam } from '../storage/uriParam';

export default function ContinueReadingCard({ item }: { item: ReadingItem }) {
  const history = useHistory();
  const pct = item.total > 0 ? Math.round((item.page / item.total) * 100) : 0;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); history.push(`/viewer/${encodeUriParam(item.uri)}`); }}
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
        <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 17 }}>{item.name}</div>
        <div style={{ opacity: .8, fontSize: 13 }}>{item.monName}</div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.25)', margin: '8px 0 4px' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#fff' }} />
        </div>
        <div style={{ fontSize: 12, opacity: .85 }}>Trang {item.page} / {item.total} · chạm để đọc tiếp</div>
      </div>
      {/* Affordance "đọc tiếp": chip tròn kem-mờ + mũi tên kem — mời bấm (card vẫn là MỘT button tổng). */}
      <div style={{
        flex: '0 0 auto', alignSelf: 'center', width: 40, height: 40, borderRadius: '50%',
        background: 'rgba(233,229,205,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IonIcon icon={arrowForward} style={{ fontSize: 20, color: 'var(--gu-cream)' }} />
      </div>
    </div>
  );
}
