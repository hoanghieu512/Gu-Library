import { IonButton } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import mascotSad from '../assets/gu-mascot-sad.svg';

// Empty-state panda buồn giọng-Gú (v1.14.0, tách dùng chung v1.23.1): panda + tiêu đề + câu thân thiện
// + nút. Mặc định nút "Về Trang chủ" (Viewer/màn duyệt). `action` (v1.27.0) thay nút mặc định — pane
// tra cứu split-screen dùng "Chọn tài liệu khác" (không rời split, không đá pane trên về Home).
export default function SadPandaState({ title = 'Uh oh', message, action, compact }: {
  title?: string; message: string; action?: { label: string; onClick: () => void }; compact?: boolean;
}) {
  const history = useHistory();
  const btn = action ?? { label: 'Về Trang chủ', onClick: () => history.push('/home') };
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: compact ? 16 : 24, textAlign: 'center',
    }}>
      <img src={mascotSad} alt="" style={{ width: compact ? 96 : 150, height: 'auto', marginBottom: compact ? 12 : 18 }} />
      <h2 className="gu-title" style={{ fontSize: compact ? 18 : 22, margin: '0 0 10px', color: 'var(--gu-brown-deep)' }}>{title}</h2>
      <p style={{ fontSize: compact ? 13 : 15, color: 'var(--gu-brown)', maxWidth: 300, lineHeight: 1.55, margin: '0 0 20px' }}>
        {message}
      </p>
      <IonButton shape="round" onClick={btn.onClick} style={{ textTransform: 'none' }}>
        {btn.label}
      </IonButton>
    </div>
  );
}
