import { useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonLabel, IonIcon,
} from '@ionic/react';
import { print, hourglassOutline } from 'ionicons/icons';

// LỚP CHUNG hàng kho (Tuyến B — Beat B1). MỘT hàng dùng cho mọi màn: Đi in · Trong Môn ·
// sheet chọn đích. Chỉ lo HÌNH + khung vuốt; MỌI hành vi (long-press, chọn-nhiều, dialog,
// toast, thao tác file) vẫn nằm ở màn gọi — component này không tự quyết gì.
//
// Vuốt trái = CHỈ ICON, phân biệt bằng MÀU (đánh đổi đã chốt: bỏ chữ). Danh sách hành động
// do màn truyền vào (Đi in 1 · tài liệu 3 · thư mục 2) → KHÔNG hard-code theo màn.

export type RowTone = 'brown' | 'danger' | 'olive';

export interface RowAction {
  key: string;
  icon: string;
  tone: RowTone;
  label: string;      // aria-label — chữ KHÔNG hiện, đây là kênh duy nhất cho screen-reader
  onClick: () => void;
  disabled?: boolean;
}

// Tông nút vuốt: tái dùng token sẵn có, KHÔNG đẻ token mới.
//   brown  = --gu-brown (in / đổi tên: hành động thường)
//   danger = --ion-color-danger đỏ-đất (xóa)
//   olive  = xanh rêu (⋯ thêm) — giữ đúng sắc đã dùng từ v1.6.0
const TONE: Record<RowTone, CSSProperties> = {
  brown: { '--background': 'var(--gu-brown)', '--color': '#fff' } as CSSProperties,
  danger: { '--background': 'var(--ion-color-danger)', '--color': '#fff' } as CSSProperties,
  olive: { '--background': '#4A5D3A', '--color': '#fff' } as CSSProperties,
};

// Dấu "cần in" cuối hàng (icon máy in nâu).
export function PrintMark() {
  return <IonIcon icon={print} style={{ color: 'var(--gu-brown)', fontSize: 18 }} aria-label="Đã chọn đi in" />;
}

// Pill "chờ Atomman xử lý" — tài liệu vừa nhập, worker chưa ghép xong.
export function PendingPill() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'var(--gu-pending)', color: '#fff',
      borderRadius: 999, padding: '3px 10px', fontSize: 12, whiteSpace: 'nowrap',
    }}>
      <IonIcon icon={hourglassOutline} style={{ fontSize: 13 }} />
      chờ xử lý
    </span>
  );
}

// Pill trạng thái chung (vd "Đã gửi đi in" xanh) — cùng khuôn với PendingPill.
export function StatusPill({ text, color = 'var(--ion-color-success)' }: { text: string; color?: string }) {
  return (
    <span style={{
      background: color, color: '#fff', borderRadius: 999,
      padding: '3px 10px', fontSize: 12, whiteSpace: 'nowrap',
    }}>{text}</span>
  );
}

export interface KhoRowProps {
  leading?: ReactNode;          // swatch màu môn / icon tài liệu / icon thư mục / checkbox
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;         // PrintMark · PendingPill · chevron · nút "Xong"…
  onClick?: () => void;
  actions?: RowAction[];        // có → vuốt trái được (icon-only)
  swipeDisabled?: boolean;
  disabled?: boolean;
  muted?: boolean;              // hàng chờ xử lý / thư mục lúc đang chọn-nhiều: chữ xám, mờ
  selected?: boolean;           // đang được tick trong chế độ chọn-nhiều (B2b) → nền nhấn nâu nhạt
  accent?: string;              // vạch màu mép trái (B2b.1: tách THƯ MỤC khỏi tài liệu khi lướt mắt)
  // Cho long-press ở màn gọi (FolderDocRow) — component KHÔNG tự xử cử chỉ.
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: () => void;
}

export default function KhoRow({
  leading, title, subtitle, trailing, onClick, actions, swipeDisabled,
  disabled, muted, selected, accent, onTouchStart, onTouchMove, onTouchEnd,
}: KhoRowProps) {
  const slideRef = useRef<HTMLIonItemSlidingElement>(null);
  // Đóng slide TRƯỚC khi chạy hành động → Hủy dialog xong không treo menu ở vị trí mở (v1.6.0).
  const fire = (fn: () => void) => { slideRef.current?.close(); fn(); };

  const item = (
    <IonItem
      button={!!onClick} detail={false} lines="none"
      onClick={onClick} disabled={disabled}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{
        // Hàng đang tick: nền nâu rất nhạt để tách khỏi hàng chưa chọn mà vẫn trong tông giấy.
        '--background': selected ? 'rgba(117,66,14,0.10)' : 'var(--gu-paper-2)',
        '--border-radius': '0',
        '--padding-top': '10px', '--padding-bottom': '10px',
        opacity: muted ? 0.55 : 1,
      } as CSSProperties}
    >
      {leading && <div slot="start" style={{ display: 'flex', alignItems: 'center' }}>{leading}</div>}
      <IonLabel className={muted ? undefined : 'gu-serif'} color={muted ? 'medium' : undefined}>
        {title}
        {subtitle && <p style={{ fontSize: 12.5, color: 'var(--gu-grey)', marginTop: 2 }}>{subtitle}</p>}
      </IonLabel>
      {trailing && <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{trailing}</div>}
    </IonItem>
  );

  // Thẻ-rời: bo góc + overflow ở div BỌC NGOÀI → thẻ và nút vuốt liền khối, không hở góc
  // (bài học v1.22.0: bo trên IonItem thì nút vuốt lòi ra ngoài đường bo).
  const card = (inner: ReactNode) => (
    <div style={{
      marginBottom: 10, borderRadius: 14, overflow: 'hidden',
      borderLeft: accent ? `4px solid ${accent}` : undefined,
    }}>{inner}</div>
  );

  if (!actions || actions.length === 0) return card(item);

  return card(
    <IonItemSliding ref={slideRef} disabled={swipeDisabled}>
      {item}
      <IonItemOptions side="end">
        {actions.map((a) => (
          <IonItemOption
            key={a.key} aria-label={a.label} disabled={a.disabled}
            onClick={() => fire(a.onClick)} style={TONE[a.tone]}
          >
            <IonIcon slot="icon-only" icon={a.icon} />
          </IonItemOption>
        ))}
      </IonItemOptions>
    </IonItemSliding>,
  );
}
