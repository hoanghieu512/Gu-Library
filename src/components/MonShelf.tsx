import { useEffect, useRef, useState } from 'react';
import type { Mon } from '../storage/types';
import { getKhoSnapshot, foldSummary } from '../storage/khoSnapshot';
import { monColor } from './MonSwatch';
import { UNFILED } from '../import/prefix';
import { spineWidth, packShelves } from '../home/shelf';

// Home "Tủ sách luật" — Beat 1: KHUNG kệ (layout động). Mỗi môn = một gáy sách đứng trên kệ:
// cao bằng nhau, bề dày = số tài liệu (spineWidth có clamp), nhồi theo bề rộng màn → tràn tầng dưới
// (packShelves), bookend gỗ chặn cuối kệ lẻ. Gáy Beat 1 = KHỐI MÀU MÔN TRƠN + nhãn tạm (chưa da/nhũ
// /gờ gân — để Beat 2). Chạm gáy → mở đúng môn (điều hướng GIỮ NGUYÊN). "Chưa phân loại" = khối đặc
// biệt (không màu môn) ở cuối (mons đã sort để nó cuối). Đo container qua ResizeObserver → Flip gập
// mở/đóng thì nhồi lại đúng.

const SHELF_H = 150; // chiều cao gáy = chiều cao kệ (tất cả bằng nhau)
const BOARD_H = 12;  // ván kệ gỗ (Beat 1 = thanh trơn)
const GAP = 3;       // khe giữa các gáy (sách kề nhau)
const BOOKEND_W = 16;

function Spine({ mon, width, count, onOpen }: { mon: Mon; width: number; count: number; onOpen: (uri: string) => void }) {
  const unfiled = mon.name === UNFILED;
  const bg = unfiled ? 'var(--gu-paper-2)' : monColor(mon.name, mon.meta.color);
  const fg = unfiled ? 'var(--gu-grey)' : '#fff';
  return (
    <div
      onClick={() => onOpen(mon.uri)}
      role="button"
      aria-label={`Mở môn ${mon.name} (${count} tài liệu)`}
      style={{
        width, height: SHELF_H, flex: '0 0 auto',
        background: bg,
        border: unfiled ? '1px dashed var(--gu-grey)' : 'none',
        borderRadius: '3px 3px 0 0',
        boxShadow: 'inset -2px 0 3px rgba(0,0,0,.18), inset 2px 0 2px rgba(255,255,255,.08)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 2px 6px', overflow: 'hidden', cursor: 'pointer',
      }}
    >
      <span style={{
        writingMode: 'vertical-rl', textOrientation: 'mixed',
        fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 13, color: fg,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxHeight: SHELF_H - 34,
        fontStyle: unfiled ? 'italic' : 'normal',
      }}>{mon.name}</span>
      <span style={{ fontSize: 11, color: fg, opacity: unfiled ? 0.7 : 0.6, lineHeight: 1 }}>{count}</span>
    </div>
  );
}

// Bookend gỗ chặn cuối kệ lẻ.
function Bookend() {
  return (
    <div style={{
      width: BOOKEND_W, height: SHELF_H, flex: '0 0 auto',
      background: 'linear-gradient(90deg, #5b3d1c, #7a5228)',
      borderRadius: '0 3px 0 0', boxShadow: 'inset -2px 0 3px rgba(0,0,0,.35)',
    }} />
  );
}

export default function MonShelf({ mons, onOpen, refreshKey = 0 }: {
  mons: Mon[]; onOpen: (uri: string) => void; refreshKey?: number;
}) {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Số tài liệu mỗi môn từ CÂY chung (foldSummary, không walk lại). Re-fetch khi mons/refreshKey đổi.
  useEffect(() => {
    let alive = true;
    getKhoSnapshot().then((snap) => {
      if (!alive) return;
      const m = new Map<string, number>();
      for (const mon of mons) {
        const f = snap.monFolders.get(mon.uri);
        m.set(mon.uri, f ? foldSummary(f).documents : 0);
      }
      setCounts(m);
    }).catch(() => { /* giữ counts cũ */ });
    return () => { alive = false; };
  }, [mons, refreshKey]);

  // Đo bề rộng kệ → nhồi lại khi đổi kích thước màn (Flip gập).
  useEffect(() => {
    const el = ref.current; if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => { for (const e of entries) setWidth(Math.floor(e.contentRect.width)); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const widths = mons.map((m) => spineWidth(counts.get(m.uri) ?? 0));
  const rows = width > 0 ? packShelves(widths, width, GAP) : [mons.map((_, i) => i)];

  return (
    <div ref={ref} style={{ padding: '4px 12px 8px' }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: GAP, height: SHELF_H }}>
            {row.map((idx) => (
              <Spine key={mons[idx].uri} mon={mons[idx]} width={widths[idx]} count={counts.get(mons[idx].uri) ?? 0} onOpen={onOpen} />
            ))}
            {ri === rows.length - 1 && <Bookend />}
          </div>
          {/* Ván kệ gỗ (Beat 1 = thanh trơn; gradient/gờ để Beat 3) */}
          <div style={{ height: BOARD_H, background: 'var(--gu-brown-deep)', borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,.25)' }} />
        </div>
      ))}
    </div>
  );
}
