import { IonIcon } from '@ionic/react';
import { bookOutline, arrowForward } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import type { ReadingItem } from '../reading/store';
import { encodeUriParam } from '../storage/uriParam';
import { readingLocator } from '../storage/folderHeader';

// Card "Đang đọc dở" — Beat 3b: BÌA DA ĐÓNG GÁY. Màu bìa MIRROR màu gáy môn của tài liệu (nhìn màu
// biết đang đọc môn nào) — cùng nguồn màu môn (monColor). Tài liệu "Chưa phân loại"/không rõ môn →
// màu trung tính (NEUTRAL). ≥2 tài liệu đọc dở → các quyển xếp chồng sau ló mép (peekColors).
// CHỈ reskin lớp trình bày — KHÔNG đụng reading-state.
const NEUTRAL = '#5a4326'; // da nâu trung tính khi không có màu môn

// Nền da: vân mảnh + sheen dọc (đỉnh sáng → đáy tối) chồng trên màu môn → mặt bìa da thật.
function leatherBg(base: string): string {
  return `
    repeating-linear-gradient(0deg, rgba(0,0,0,.04), rgba(0,0,0,.04) 1px, rgba(255,255,255,.02) 1px, rgba(255,255,255,.02) 3px),
    linear-gradient(180deg, rgba(255,255,255,.16), rgba(0,0,0,.05) 42%, rgba(0,0,0,.30)),
    ${base}`;
}

export default function ContinueReadingCard({ item, color, peekColors = [] }: {
  item: ReadingItem; color?: string; peekColors?: (string | undefined)[];
}) {
  const history = useHistory();
  const pct = item.total > 0 ? Math.round((item.page / item.total) * 100) : 0;
  const base = color ?? NEUTRAL;
  const peeks = peekColors.slice(0, 2);

  return (
    <div style={{ position: 'relative', margin: peeks.length ? '12px 0 20px' : '12px 0' }}>
      {/* Quyển xếp chồng sau — ló mép ở đáy + hai bên (nhận diện "còn nhiều quyển đang đọc dở") */}
      {peeks.map((c, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: 'absolute', left: (i + 1) * 7, right: (i + 1) * 7,
            top: (i + 1) * 7, bottom: -(i + 1) * 7, borderRadius: 16,
            background: leatherBg(c ?? NEUTRAL), zIndex: 1 - (i + 1),
            boxShadow: '0 4px 8px rgba(0,0,0,.28)',
          }}
        />
      ))}

      <div
        onClick={(e) => { e.stopPropagation(); history.push(`/viewer/${encodeUriParam(item.uri)}`); }}
        style={{
          position: 'relative', zIndex: 2,
          background: leatherBg(base), color: 'var(--gu-cream)', borderRadius: 16,
          padding: '16px 16px 16px 22px', display: 'flex', gap: 14, cursor: 'pointer',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.14), inset 0 -6px 12px rgba(0,0,0,.22), 0 4px 10px rgba(0,0,0,.3)',
          overflow: 'hidden',
        }}
      >
        {/* Gáy bìa (left spine): dải tối dọc + hai gờ gân nhũ → cảm giác quyển sách đóng gáy */}
        <div aria-hidden style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 12,
          background: 'linear-gradient(90deg, rgba(0,0,0,.42), rgba(0,0,0,.05))',
          borderRight: '1px solid rgba(231,197,110,.35)',
        }}>
          <div style={{ position: 'absolute', top: '30%', left: 2, right: 2, height: 2, background: 'rgba(231,197,110,.4)', borderRadius: 2 }} />
          <div style={{ position: 'absolute', top: '62%', left: 2, right: 2, height: 2, background: 'rgba(231,197,110,.4)', borderRadius: 2 }} />
        </div>

        {/* Ruy-băng đỏ (bookmark) — ló từ đỉnh bìa, đuôi khía chữ V */}
        <div aria-hidden style={{
          position: 'absolute', top: -2, right: 62, width: 14, height: 52, zIndex: 3,
          background: 'linear-gradient(180deg, #b23a3a, #7c1f1f)',
          clipPath: 'polygon(0 0,100% 0,100% 100%,50% 72%,0 100%)',
          boxShadow: '0 2px 3px rgba(0,0,0,.4)',
        }} />

        {/* Huy hiệu bìa (medallion) khung nhũ vàng + icon sách */}
        <div style={{
          width: 56, height: 56, borderRadius: 10, flex: '0 0 auto',
          background: 'rgba(0,0,0,.22)', border: '1px solid rgba(231,197,110,.55)',
          boxShadow: 'inset 0 0 0 2px rgba(0,0,0,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IonIcon icon={bookOutline} style={{ fontSize: 28, color: '#e7c56e' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 17, textShadow: '0 1px 1px rgba(0,0,0,.35)' }}>{item.name}</div>
          <div style={{ opacity: .82, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{readingLocator(item.path)}</div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(0,0,0,.28)', margin: '8px 0 4px' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#e7c56e' }} />
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
    </div>
  );
}
