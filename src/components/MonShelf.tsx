import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Mon } from '../storage/types';
import { getKhoSnapshot, foldSummary } from '../storage/khoSnapshot';
import { listInboxByMon } from '../import/inboxRepo';
import { monColor } from './MonSwatch';
import { UNFILED } from '../import/prefix';
import { spineWidth, packShelves } from '../home/shelf';
import { spineLabel } from '../home/spineLabel';

// Home "Tủ sách luật" — Beat 2: DA SÁCH (visual). Khung + layout động = Beat 1 (shelf.ts, KHÔNG đụng).
// Beat này biến gáy KHỐI TRƠN → gáy sách luật: da nâu tint theo màu môn + band nhũ vàng tên môn chạy
// dọc + band tối đáy dập SỐ TÀI LIỆU + gờ gân (hub) đầu gáy + nơ pending ló đầu. Kệ gỗ ấm. "Chưa phân
// loại" GIỮ khối giấy đặc biệt (không da sách). Điều hướng chạm gáy GIỮ NGUYÊN.

const SHELF_H = 150;
const BOARD_H = 12;
const GAP = 3;
const BOOKEND_W = 16;
const GOLD = '#e7c56e';
const GOLD_DIM = '#cba152';
const RIBBON = '#B5651D';
const WOOD = 'linear-gradient(180deg, #6b4823, #4f3416)'; // lòng kệ gỗ ấm

// Gờ gân (raised hub) — vạch ngang nổi ở đầu gáy.
const hub: CSSProperties = {
  height: 5, flex: '0 0 auto', marginTop: 2,
  background: 'linear-gradient(rgba(255,255,255,.18), rgba(0,0,0,.30))',
  boxShadow: '0 1px 1px rgba(0,0,0,.22)',
};

function LeatherSpine({ mon, width, docs, pending, onOpen }: {
  mon: Mon; width: number; docs: number; pending: number; onOpen: (uri: string) => void;
}) {
  const base = monColor(mon.name, mon.meta.color);
  return (
    <div style={{ position: 'relative', width, height: SHELF_H, flex: '0 0 auto' }}>
      {/* Nơ pending ló đầu gáy + SỐ file chờ ở giữa (chỉ khi môn còn file chờ) */}
      {pending > 0 && (
        <div style={{
          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
          width: 18, height: 28, background: RIBBON, zIndex: 3,
          clipPath: 'polygon(0 0,100% 0,100% 100%,50% 76%,0 100%)',
          boxShadow: '0 1px 2px rgba(0,0,0,.4)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 3,
        }}>
          <span style={{ color: '#fff', fontWeight: 700, lineHeight: 1, fontSize: pending >= 10 ? 9 : 12 }}>{pending}</span>
        </div>
      )}
      <div
        onClick={() => onOpen(mon.uri)}
        role="button"
        aria-label={`Mở môn ${mon.name} (${docs} tài liệu${pending > 0 ? `, ${pending} chờ xử lý` : ''})`}
        style={{
          width: '100%', height: '100%', cursor: 'pointer', overflow: 'hidden',
          borderRadius: '4px 4px 0 0',
          // Da nâu tint theo màu môn: sheen trụ (mép tối, giữa sáng) chồng trên màu môn.
          background: `linear-gradient(90deg, rgba(0,0,0,.36), rgba(255,255,255,.12) 16%, rgba(255,255,255,.03) 52%, rgba(0,0,0,.40)), ${base}`,
          boxShadow: 'inset 0 3px 4px rgba(255,255,255,.10), inset 0 -7px 10px rgba(0,0,0,.32)',
          borderTop: '1px solid rgba(255,255,255,.16)',
          display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        }}
      >
        <div style={hub} />
        <div style={{ ...hub, marginTop: 3 }} />
        {/* Cartouche nhũ vàng: TÊN MÔN chạy dọc, ellipsis khi gáy mỏng/tên dài (không tràn/đè) */}
        <div style={{
          flex: 1, minHeight: 0, margin: '6px 3px', padding: '3px 0',
          border: `1px solid rgba(231,197,110,.5)`, borderRadius: 2, overflow: 'hidden',
          background: 'linear-gradient(90deg, rgba(0,0,0,.16), rgba(0,0,0,.04))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Tên gáy: bỏ tiền tố "Luật " (spineLabel) + WRAP nhiều cột dọc (whiteSpace normal) thay
              ellipsis — thu cỡ chữ theo bề dày gáy; ellipsis KHÔNG dùng (né cắt cụt giữa chữ). */}
          <span style={{
            writingMode: 'vertical-rl', textOrientation: 'mixed',
            whiteSpace: 'normal', wordBreak: 'break-word', overflow: 'hidden', maxHeight: '100%',
            fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: width < 32 ? 9.5 : (width < 50 ? 11 : 12.5),
            color: GOLD, textShadow: '0 1px 1px rgba(0,0,0,.55)', letterSpacing: 0.2,
            lineHeight: 1.06, textAlign: 'center',
          }}>{spineLabel(mon.name)}</span>
        </div>
        {/* Band số tài liệu đáy (dập nhũ) */}
        <div style={{
          margin: '0 3px 5px', padding: '2px 1px', borderRadius: 2, overflow: 'hidden',
          borderTop: `1px solid rgba(231,197,110,.45)`, background: 'rgba(0,0,0,.30)', textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 14, lineHeight: 1, color: GOLD, textShadow: '0 1px 1px rgba(0,0,0,.5)' }}>{docs}</div>
          {/* Nhãn "TÀI LIỆU" chỉ khi gáy đủ rộng — gáy mỏng chỉ hiện số (né clip giữa chữ) */}
          {width >= 34 && <div style={{ fontSize: 6, letterSpacing: 0.4, color: GOLD_DIM, marginTop: 1, whiteSpace: 'nowrap' }}>TÀI LIỆU</div>}
        </div>
      </div>
    </div>
  );
}

// "Chưa phân loại" — GIỮ khối giấy đặc biệt Beat 1 (không da sách), phân biệt với môn có màu.
function PaperSpine({ mon, width, docs, onOpen }: { mon: Mon; width: number; docs: number; onOpen: (uri: string) => void }) {
  return (
    <div
      onClick={() => onOpen(mon.uri)}
      role="button"
      aria-label={`Mở ${mon.name} (${docs} tài liệu)`}
      style={{
        width, height: SHELF_H, flex: '0 0 auto', cursor: 'pointer', overflow: 'hidden',
        background: 'var(--gu-paper-2)', border: '1px dashed var(--gu-grey)', borderRadius: '3px 3px 0 0',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 2px 6px',
      }}
    >
      <span style={{
        writingMode: 'vertical-rl', textOrientation: 'mixed', whiteSpace: 'nowrap', overflow: 'hidden',
        textOverflow: 'ellipsis', maxHeight: SHELF_H - 34, fontFamily: 'var(--gu-serif)', fontStyle: 'italic',
        fontWeight: 700, fontSize: 13, color: 'var(--gu-grey)',
      }}>{mon.name}</span>
      <span style={{ fontSize: 11, color: 'var(--gu-grey)', opacity: 0.75, lineHeight: 1 }}>{docs}</span>
    </div>
  );
}

function Bookend() {
  return (
    <div aria-hidden style={{
      width: BOOKEND_W, height: SHELF_H, flex: '0 0 auto',
      background: 'linear-gradient(90deg, #5b3d1c, #7a5228)',
      borderRadius: '0 3px 0 0', boxShadow: 'inset -2px 0 3px rgba(0,0,0,.35)',
    }} />
  );
}

interface Counts { docs: number; pending: number; }

export default function MonShelf({ mons, onOpen, refreshKey = 0 }: {
  mons: Mon[]; onOpen: (uri: string) => void; refreshKey?: number;
}) {
  const [counts, setCounts] = useState<Map<string, Counts>>(new Map());
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    // pending "môn có file ⏳" = file chưa-ghép TRONG cây môn (foldSummary.pending) + file đã import
    // đang chờ worker ở `_inbox/` gốc kho (listInboxByMon, theo tiền tố tên môn). PHẢI cộng cả hai —
    // file import qua app nằm ở `_inbox/`, không trong folder môn (bug Beat 2: thiếu nguồn _inbox).
    Promise.all([getKhoSnapshot(), listInboxByMon().catch(() => new Map<string, number>())]).then(([snap, inbox]) => {
      if (!alive) return;
      const m = new Map<string, Counts>();
      for (const mon of mons) {
        const f = snap.monFolders.get(mon.uri);
        const s = f ? foldSummary(f) : { documents: 0, pending: 0 };
        m.set(mon.uri, { docs: s.documents, pending: s.pending + (inbox.get(mon.name) ?? 0) });
      }
      setCounts(m);
    }).catch(() => { /* giữ counts cũ */ });
    return () => { alive = false; };
  }, [mons, refreshKey]);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => { for (const e of entries) setWidth(Math.floor(e.contentRect.width)); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const docsOf = (uri: string) => counts.get(uri)?.docs ?? 0;
  const widths = mons.map((m) => spineWidth(docsOf(m.uri)));
  const rows = width > 0 ? packShelves(widths, width, GAP) : [mons.map((_, i) => i)];

  return (
    // Khung tủ gỗ bao 4 cạnh (viền dày) — bọc mọi hộc → cảm giác "tủ sách" thật.
    <div style={{
      margin: '4px 12px 10px', borderRadius: 7, padding: 7,
      background: 'linear-gradient(135deg, #825731, #5b3d1c)',
      boxShadow: '0 5px 13px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.15)',
    }}>
      <div ref={ref}>
        {rows.map((row, ri) => (
          <div key={ri}>
            {/* Mỗi tầng = HỘC có chiều sâu: lòng gỗ ấm + bóng đổ vào trong (đỉnh + 2 thành) +
                headroom trên để nơ pending ló lên (không đè plank tầng trên). */}
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: GAP, minHeight: SHELF_H + 12, paddingTop: 12,
              background: WOOD, overflow: 'visible',
              boxShadow: 'inset 0 7px 10px rgba(0,0,0,.5), inset 7px 0 9px rgba(0,0,0,.32), inset -7px 0 9px rgba(0,0,0,.32)',
            }}>
              {row.map((idx) => {
                const m = mons[idx];
                const c = counts.get(m.uri) ?? { docs: 0, pending: 0 };
                return m.name === UNFILED
                  ? <PaperSpine key={m.uri} mon={m} width={widths[idx]} docs={c.docs} onOpen={onOpen} />
                  : <LeatherSpine key={m.uri} mon={m} width={widths[idx]} docs={c.docs} pending={c.pending} onOpen={onOpen} />;
              })}
              {ri === rows.length - 1 && <Bookend />}
            </div>
            {/* Ván đáy hộc (mặt gỗ trên có ánh sáng, dưới có bóng) */}
            <div style={{ height: BOARD_H, background: 'linear-gradient(180deg, #8a5f2e, #5b3d1c)', boxShadow: '0 3px 4px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.18)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
