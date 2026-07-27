import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { IonPopover, IonList, IonItem, IonLabel, IonIcon } from '@ionic/react';
import { folderOutline } from 'ionicons/icons';

export interface Crumb { name: string; uri: string; }

// Header bấm-nhảy-tầng (v1.20.0). Mỗi tầng cha = vùng chạm nhảy LÊN thẳng thư mục đó; tầng cuối
// (đang đứng) KHÔNG bấm. Giữ ĐÚNG quy tắc rút gọn folderHeaderTitle v1.15.0: 1 tầng = tên môn;
// 2 tầng = "Môn / Thư mục"; ≥3 tầng = "… / Cha / Hiện tại", trong đó `…` bấm mở danh sách các tầng
// cha bị nuốt (đủ + đúng thứ tự, KỂ CẢ tầng môn). CHỈ nhảy lên — không dropdown con, không nhảy ngang.
// B2b — áp da: tầng CHA nâu nhạt hơn (là lối đi), tầng ĐANG ĐỨNG nâu đậm (là chỗ mình ở); `…` thành
// chip nhỏ nền giấy cho thấy bấm được. Vùng chạm 44px và luật rút gọn GIỮ NGUYÊN.
const HIT: CSSProperties = { minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 4px' };
// Tầng ĐANG ĐỨNG co SAU CÙNG (flexShrink 1) — tên mình cần đọc thì phải đọc được;
// tầng CHA co TRƯỚC (flexShrink 100) + cap 40% bề ngang — nó chỉ là bàn đạp nhảy, cụt vẫn bấm đúng.
// Trước đây cả hai cùng `flex: 0 1 auto` nên co đều → cắt luôn cả tên đang đứng.
const SHRINK: CSSProperties = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
// KHÔNG cap max-width tầng cha: cap sẽ cắt nó ngay cả khi màn còn thừa chỗ. Chỉ cần TRỌNG SỐ co
// (100 vs 1) — dư chỗ thì không ai bị cắt, thiếu chỗ thì cha nhường trước.
const PARENT: CSSProperties = {
  ...SHRINK, color: 'var(--gu-brown)', fontWeight: 500,
  flexGrow: 0, flexShrink: 100, flexBasis: 'auto',
};
const CURRENT: CSSProperties = {
  ...SHRINK, color: 'var(--gu-brown-deep)', fontWeight: 700,
  flexGrow: 0, flexShrink: 1, flexBasis: 'auto',
};
// Ngưỡng "chật": tổng tên cha + tên đang đứng quá dài thì BỎ HẲN tầng cha khỏi thanh, dồn nó vào
// `…` (không mất lối đi — popover vẫn liệt kê đủ). Đếm ký tự CỐ Ý thô: đây là lựa chọn bố cục
// nhị phân (hiện/ẩn một tầng), đoán trượt thì bố cục vẫn hợp lệ — KHÁC hẳn việc chỉnh cỡ chữ theo
// pixel font (thứ đã lệch giữa hai máy ở v1.21.0).
const TIGHT = 26;

export default function HeaderBreadcrumb({ crumbs, onJump }: { crumbs: Crumb[]; onJump: (uri: string) => void }) {
  const [popEvent, setPopEvent] = useState<Event | undefined>(undefined);

  if (crumbs.length === 0) return <span>Môn / Chương</span>;

  const sep = (k: string) => (
    <span key={k} style={{ color: 'var(--gu-grey)', flex: '0 0 auto', padding: '0 2px', fontWeight: 400 }}>/</span>
  );
  const last = crumbs[crumbs.length - 1];
  const parents = crumbs.slice(0, -1);
  const nearest = parents[parents.length - 1];
  // Chật → không hiện tầng cha gần nhất trên thanh nữa, dồn nó vào `…` (vẫn tới được qua popover).
  const tight = !!nearest && nearest.name.length + last.name.length > TIGHT;
  const inlineParent = nearest && !tight ? nearest : null;
  const hidden = inlineParent ? parents.slice(0, -1) : parents; // tầng cha nằm trong `…`, đúng thứ tự

  const plain = (c: Crumb, k: string) => <span key={k} style={{ ...HIT, ...CURRENT }}>{c.name}</span>;
  const link = (c: Crumb, k: string) => (
    c.uri
      ? <span key={k} role="button" onClick={() => onJump(c.uri)} style={{ ...HIT, ...PARENT, cursor: 'pointer' }}>{c.name}</span>
      : <span key={k} style={{ ...HIT, ...PARENT }}>{c.name}</span> // uri chưa resolve (snapshot stale) → không bấm
  );

  const row: ReactNode[] = [];
  if (hidden.length > 0) {
    row.push(
      <span
        key="ell" role="button" aria-label="Các tầng trên"
        onClick={(e) => setPopEvent(e.nativeEvent)}
        style={{
          ...HIT, flex: '0 0 auto', cursor: 'pointer', color: 'var(--gu-brown)', fontWeight: 500,
          // Chip nhỏ → thấy ngay là bấm được (trước chỉ là dấu "…" trần). Nền KEM chứ không phải
          // giấy: toolbar vốn đã là `--gu-paper-2` nên chip nền giấy sẽ tàng hình.
          background: 'var(--gu-cream)', borderRadius: 8, padding: '0 8px', minWidth: 34,
          justifyContent: 'center', lineHeight: 1,
        }}
      >…</span>,
      sep('s-ell'),
    );
  }
  if (inlineParent) row.push(link(inlineParent, 'par'), sep('s-par'));
  row.push(plain(last, 'cur'));

  return (
    <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', maxWidth: '100%' }}>
      {row}
      <IonPopover isOpen={!!popEvent} event={popEvent} onDidDismiss={() => setPopEvent(undefined)}>
        <IonList style={{ background: 'var(--gu-paper-2)' }}>
          {hidden.map((c) => (
            <IonItem
              key={c.uri} button detail={false} lines="none"
              onClick={() => { setPopEvent(undefined); onJump(c.uri); }}
              style={{ '--background': 'var(--gu-paper-2)' } as CSSProperties}
            >
              <IonIcon icon={folderOutline} slot="start" style={{ color: 'var(--gu-brown)', fontSize: 18 }} />
              <IonLabel className="gu-serif" style={{ color: 'var(--gu-brown-deep)' }}>{c.name}</IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonPopover>
    </div>
  );
}
