import type { CSSProperties } from 'react';
import { IonModal, IonButton, IonIcon } from '@ionic/react';
import { checkmarkCircle } from 'ionicons/icons';

interface Props {
  open: boolean;
  phase: 'importing' | 'done';
  done: number;   // file thứ đang nhập (1-indexed)
  total: number;
  ok: number;     // số file đã nhập xong (cho màn done)
  onCancel: () => void;
  onViewKho: () => void;
}

const R = 34;
const C = 2 * Math.PI * R;

// Modal tiến trình nhập lô (dialog nhỏ giữa màn, dùng IonModal có sẵn). Không đóng tay lúc đang
// nhập (backdropDismiss=false); chỉ Hủy (đang nhập) hoặc Xem kho (xong) — CHỈ MỘT điểm kết.
export default function ImportProgressModal({ open, phase, done, total, ok, onCancel, onViewKho }: Props) {
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <IonModal
      isOpen={open}
      backdropDismiss={false}
      style={{ '--width': '300px', '--height': 'auto', '--border-radius': '18px', '--background': 'var(--gu-paper-2)' } as CSSProperties}
    >
      <div style={{ padding: 26, textAlign: 'center' }}>
        {phase === 'importing' ? (
          <>
            <svg width="100" height="100" viewBox="0 0 88 88" style={{ display: 'block', margin: '0 auto 16px' }}>
              <circle cx="44" cy="44" r={R} fill="none" stroke="rgba(85,59,8,0.14)" strokeWidth="7" />
              <circle
                cx="44" cy="44" r={R} fill="none" stroke="var(--gu-brown)" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 44 44)"
                style={{ transition: 'stroke-dashoffset 240ms ease' }}
              />
              <text x="44" y="50" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--gu-brown-deep)">
                {Math.round(pct * 100)}%
              </text>
            </svg>
            <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 17, color: 'var(--gu-brown-deep)' }}>
              Đang nhập {done}/{total}…
            </div>
            <div style={{ fontSize: 13, color: 'var(--gu-grey)', margin: '6px 0 18px' }}>
              Vui lòng không tắt ứng dụng.
            </div>
            <IonButton fill="clear" color="danger" onClick={onCancel} style={{ textTransform: 'none' }}>Hủy</IonButton>
          </>
        ) : (
          <>
            <IonIcon icon={checkmarkCircle} style={{ fontSize: 60, color: '#6f9350', marginBottom: 10 }} />
            <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 18, color: 'var(--gu-brown-deep)' }}>
              Đã nhập {ok}/{total} file
            </div>
            <div style={{ fontSize: 13, color: 'var(--gu-grey)', margin: '6px 0 18px' }}>
              File đang chờ xử lý — sẽ vào môn sau khi phân loại.
            </div>
            <IonButton shape="round" onClick={onViewKho} style={{ textTransform: 'none' }}>Xem kho</IonButton>
          </>
        )}
      </div>
    </IonModal>
  );
}
