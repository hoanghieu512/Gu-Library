import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Mon } from '../storage/types';
import MonActionsSheet from './MonActionsSheet';
import BookPress from './BookPress';
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

// Gờ gân (raised hub) — vạch ngang NỔI chia gáy thành ô, như sách đóng gáy thật.
const hub: CSSProperties = {
  height: 7, flex: '0 0 auto',
  background: 'linear-gradient(180deg, rgba(255,255,255,.24), rgba(0,0,0,.06) 45%, rgba(0,0,0,.4))',
  borderTop: '1px solid rgba(255,255,255,.2)',
  borderBottom: '1px solid rgba(0,0,0,.32)',
  boxShadow: '0 1px 2px rgba(0,0,0,.28)',
};

// GÁY THỬ hướng SVG-ART (Beat 3a exp): vân da bằng feTurbulence (nhiễu phân dạng) + sheen trụ +
// gờ nổi + khung nhũ + chữ (foreignObject, wrap). Da render THẬT hơn CSS phẳng NHƯNG vẫn TINT theo
// màu môn (rect màu nền dưới nhiễu). Chỉ áp 1 gáy mẫu để Gú so; nếu ưng → nhân ra mọi gáy.
function ArtLeather({ width, color, label, docs }: { width: number; color: string; label: string; docs: number }) {
  const id = useMemo(() => 'ls' + Math.random().toString(36).slice(2, 8), []);
  const fs = width < 32 ? 9.5 : width < 50 ? 11 : 12.5;
  const band = (y: number, i: number) => (
    <g key={i}>
      <rect x="0" y={y} width={width} height="7" fill="#000" opacity=".16" />
      <rect x="0" y={y} width={width} height="1.4" fill="#fff" opacity=".22" />
      <rect x="0" y={y + 5.6} width={width} height="1.4" fill="#000" opacity=".32" />
    </g>
  );
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} 150`} preserveAspectRatio="none" style={{ display: 'block', borderRadius: '5px 5px 0 0' }}>
      <defs>
        <filter id={`${id}g`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.32" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .16 0" />
        </filter>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".52" /><stop offset=".16" stopColor="#000" stopOpacity=".08" />
          <stop offset=".3" stopColor="#fff" stopOpacity=".2" /><stop offset=".55" stopColor="#fff" stopOpacity="0" />
          <stop offset=".82" stopColor="#000" stopOpacity=".22" /><stop offset="1" stopColor="#000" stopOpacity=".56" />
        </linearGradient>
        <linearGradient id={`${id}au`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0d488" /><stop offset=".5" stopColor="#cba152" /><stop offset="1" stopColor="#9a7a2e" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height="150" fill={color} />
      <rect x="0" y="0" width={width} height="150" filter={`url(#${id}g)`} />
      <rect x="0" y="0" width={width} height="150" fill={`url(#${id}c)`} />
      <rect x="0" y="0" width={width} height="2.5" fill="#fff" opacity=".28" />
      {band(15, 0)}{band(118, 1)}
      <rect x="3" y="27" width={width - 6} height="86" fill="none" stroke={`url(#${id}au)`} strokeWidth="1.3" rx="2" />
      <rect x="5.5" y="29.5" width={width - 11} height="81" fill="none" stroke={`url(#${id}au)`} strokeWidth=".5" rx="1" opacity=".7" />
      <foreignObject x="4" y="29" width={width - 8} height="82">
        <div style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          <span style={{
            writingMode: 'vertical-rl', textOrientation: 'mixed', whiteSpace: 'normal', wordBreak: 'break-word',
            overflow: 'hidden', maxHeight: '100%', fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: fs,
            color: GOLD, textShadow: '0 1px 1px rgba(0,0,0,.6)', letterSpacing: 0.2, lineHeight: 1.06, textAlign: 'center',
          }}>{label}</span>
        </div>
      </foreignObject>
      <rect x="4" y="124" width={width - 8} height="20" rx="2" fill="#000" opacity=".34" />
      <text x={width / 2} y="137" textAnchor="middle" fontFamily="var(--gu-serif)" fontWeight="700" fontSize="13" fill={GOLD}>{docs}</text>
    </svg>
  );
}

function LeatherSpine({ mon, width, docs, pending, pulled, art, onTap, onLongPress }: {
  mon: Mon; width: number; docs: number; pending: number; pulled: boolean; art?: boolean;
  onTap: () => void; onLongPress: () => void;
}) {
  const base = monColor(mon.name, mon.meta.color);
  // Tap = mở môn; NHẤN GIỮ (450ms) = rút sách + menu. Hủy long-press khi ngón di >10px (cuộn kệ) hoặc
  // nhấc sớm. `fired` nuốt click phát sinh sau long-press → tap không lẫn (pattern FolderDocRow v1.6.0).
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = undefined; } };
  useEffect(() => () => clear(), []);
  const onTouchStart = (e: React.TouchEvent) => {
    fired.current = false;
    const t = e.touches[0]; start.current = { x: t.clientX, y: t.clientY };
    clear();
    timer.current = setTimeout(() => { fired.current = true; onLongPress(); }, 450);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0]; const s = start.current;
    if (s && (Math.abs(t.clientX - s.x) > 10 || Math.abs(t.clientY - s.y) > 10)) clear();
  };
  const onClick = () => { if (fired.current) { fired.current = false; return; } onTap(); };
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
        onClick={onClick}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={clear} onTouchCancel={clear}
        role="button"
        aria-label={`Mở môn ${mon.name} (${docs} tài liệu${pending > 0 ? `, ${pending} chờ xử lý` : ''})`}
        style={{
          width: '100%', height: '100%', cursor: 'pointer', overflow: 'hidden',
          borderRadius: '5px 5px 0 0',
          // Da nâu THỰC hơn: (1) vân da mảnh (repeating-gradient mờ) + (2) sheen TRỤ tròn (mép tối →
          // dải sáng lệch trái → mép tối) chồng trên (3) màu môn → gáy cong như da bò thật.
          // `art` = gáy thử SVG (ArtLeather tự vẽ nền) → div nền trong suốt.
          background: art ? 'transparent' : `
            repeating-linear-gradient(0deg, rgba(0,0,0,.05), rgba(0,0,0,.05) 1px, rgba(255,255,255,.02) 1px, rgba(255,255,255,.02) 3px),
            linear-gradient(90deg, rgba(0,0,0,.5), rgba(0,0,0,.14) 7%, rgba(255,255,255,.16) 22%, rgba(255,255,255,.03) 50%, rgba(0,0,0,.2) 80%, rgba(0,0,0,.52)),
            ${base}`,
          borderTop: art ? 'none' : '1px solid rgba(255,255,255,.2)',
          display: 'flex', flexDirection: 'column', alignItems: 'stretch',
          // Rút sách: nhấc gáy lên + sáng + đổ bóng khi menu mở.
          transition: 'transform .18s ease, filter .18s ease, box-shadow .18s ease',
          transform: pulled ? 'translateY(-16px)' : 'none',
          filter: pulled ? 'brightness(1.1)' : 'none',
          position: 'relative', zIndex: pulled ? 4 : 1,
          boxShadow: pulled
            ? 'inset 0 3px 4px rgba(255,255,255,.10), 0 9px 16px rgba(0,0,0,.5)'
            : 'inset 0 3px 4px rgba(255,255,255,.10), inset 0 -7px 10px rgba(0,0,0,.32)',
        }}
      >
        {art && <ArtLeather width={width} color={base} label={spineLabel(mon.name)} docs={docs} />}
        {!art && <>
        {/* Đầu gáy (head): mép sáng như đỉnh sách bắt sáng */}
        <div style={{ height: 3, flex: '0 0 auto', background: 'linear-gradient(180deg, rgba(255,255,255,.28), transparent)' }} />
        <div style={{ ...hub, marginTop: 3 }} />
        {/* Ô tên: khung nhũ vàng ĐÔI (tooling) + TÊN MÔN chạy dọc, wrap nhiều cột (không ellipsis giữa chữ) */}
        <div style={{
          flex: 1, minHeight: 0, margin: '5px 3px', padding: '4px 0',
          border: `1px solid rgba(231,197,110,.6)`, borderRadius: 2, overflow: 'hidden',
          boxShadow: 'inset 0 0 0 2px rgba(0,0,0,.28), inset 0 0 0 3px rgba(231,197,110,.3)',
          background: 'linear-gradient(90deg, rgba(0,0,0,.22), rgba(0,0,0,.05) 50%, rgba(0,0,0,.22))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            writingMode: 'vertical-rl', textOrientation: 'mixed',
            whiteSpace: 'normal', wordBreak: 'break-word', overflow: 'hidden', maxHeight: '100%',
            fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: width < 32 ? 9.5 : (width < 50 ? 11 : 12.5),
            color: GOLD, textShadow: '0 1px 1px rgba(0,0,0,.6)', letterSpacing: 0.2,
            lineHeight: 1.06, textAlign: 'center',
          }}>{spineLabel(mon.name)}</span>
        </div>
        <div style={hub} />
        {/* Ô số tài liệu đáy (dập nhũ) */}
        <div style={{
          margin: '5px 3px 6px', padding: '3px 1px', borderRadius: 2, overflow: 'hidden',
          border: '1px solid rgba(231,197,110,.4)', background: 'rgba(0,0,0,.34)', textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 14, lineHeight: 1, color: GOLD, textShadow: '0 1px 1px rgba(0,0,0,.5)' }}>{docs}</div>
          {width >= 34 && <div style={{ fontSize: 6, letterSpacing: 0.4, color: GOLD_DIM, marginTop: 1, whiteSpace: 'nowrap' }}>TÀI LIỆU</div>}
        </div>
        </>}
      </div>
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

export default function MonShelf({ mons, onOpen, onRename, onDelete, onColor, refreshKey = 0 }: {
  mons: Mon[];
  onOpen: (uri: string) => void;
  onRename: (mon: Mon) => void;
  onDelete: (mon: Mon) => void;
  onColor: (mon: Mon) => void;
  refreshKey?: number;
}) {
  const [counts, setCounts] = useState<Map<string, Counts>>(new Map());
  const [width, setWidth] = useState(0);
  const [menuMon, setMenuMon] = useState<Mon | null>(null); // môn đang mở menu (rút sách)
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
                // "Chưa phân loại" = MÁY ÉP SÁCH (book press) — luôn cuối kệ (sortMons), thay khối giấy.
                return m.name === UNFILED
                  ? <BookPress key={m.uri} uri={m.uri} count={c.docs} onOpen={onOpen} />
                  : <LeatherSpine
                      key={m.uri} mon={m} width={widths[idx]} docs={c.docs} pending={c.pending}
                      pulled={menuMon?.uri === m.uri} art={idx === 0}
                      onTap={() => onOpen(m.uri)}
                      onLongPress={() => setMenuMon(m)}
                    />;
              })}
              {/* Bookend chỉ khi phần tử cuối KHÔNG phải book press (press tự chặn cuối kệ). */}
              {ri === rows.length - 1 && mons[row[row.length - 1]].name !== UNFILED && <Bookend />}
            </div>
            {/* Ván đáy hộc (mặt gỗ trên có ánh sáng, dưới có bóng) */}
            <div style={{ height: BOARD_H, background: 'linear-gradient(180deg, #8a5f2e, #5b3d1c)', boxShadow: '0 3px 4px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.18)' }} />
          </div>
        ))}
      </div>

      {/* Sheet rút-sách (nhấn giữ gáy môn thường) — kiểu thẻ-rời như DocActionsSheet. Book press không tới đây. */}
      <MonActionsSheet
        mon={menuMon}
        onColor={() => { const m = menuMon; setMenuMon(null); if (m) onColor(m); }}
        onRename={() => { const m = menuMon; setMenuMon(null); if (m) onRename(m); }}
        onDelete={() => { const m = menuMon; setMenuMon(null); if (m) onDelete(m); }}
        onClose={() => setMenuMon(null)}
      />
    </div>
  );
}
