import { IonIcon } from '@ionic/react';
import { search } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

export default function SearchShortcut() {
  const history = useHistory();
  return (
    <div
      onClick={() => history.push('/search')}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--gu-white)', border: '1px solid var(--gu-grey)',
        borderRadius: 999, padding: '10px 16px', margin: '8px 0', cursor: 'pointer',
        color: 'var(--gu-grey)',
      }}
    >
      <IonIcon icon={search} />
      <span>Tìm trong tài liệu…</span>
    </div>
  );
}
