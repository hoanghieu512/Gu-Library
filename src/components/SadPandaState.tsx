import { IonButton } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import mascotSad from '../assets/gu-mascot-sad.svg';

// Empty-state panda buồn giọng-Gú (v1.14.0, tách dùng chung v1.23.1): panda + tiêu đề + câu thân thiện
// + nút "Về Trang chủ". Dùng cho Viewer (không mở được tài liệu) và màn duyệt (thư mục bị xóa từ máy khác).
export default function SadPandaState({ title = 'Uh oh', message }: { title?: string; message: string }) {
  const history = useHistory();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: 24, textAlign: 'center',
    }}>
      <img src={mascotSad} alt="" style={{ width: 150, height: 'auto', marginBottom: 18 }} />
      <h2 className="gu-title" style={{ fontSize: 22, margin: '0 0 10px', color: 'var(--gu-brown-deep)' }}>{title}</h2>
      <p style={{ fontSize: 15, color: 'var(--gu-brown)', maxWidth: 300, lineHeight: 1.55, margin: '0 0 24px' }}>
        {message}
      </p>
      <IonButton shape="round" onClick={() => history.push('/home')} style={{ textTransform: 'none' }}>
        Về Trang chủ
      </IonButton>
    </div>
  );
}
