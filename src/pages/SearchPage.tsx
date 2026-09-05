import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonSpinner } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { searchOutline, closeCircle } from 'ionicons/icons';
import { loadIndex, refreshIndex } from '../search/store';
import { search, parseQuery } from '../search/invertedIndex';
import type { Hit, SearchIndex } from '../search/invertedIndex';
import { makeSnippet } from '../search/snippet';
import { encodeUriParam } from '../storage/uriParam';
import MonSwatch from '../components/MonSwatch';

// Màn Tìm — tra toàn văn trong kho (Phase 2, spec §7).
//
// Chỉ mục nằm trong IndexedDB của máy, KHÔNG vào cây Syncthing (spec §4.3: dữ liệu phái sinh).
// Lần đầu phải đọc hết sidecar nên mất chục giây — có tiến độ nhìn thấy được; những lần sau nạp
// lại chưa tới một giây, rồi làm mới NGẦM ở phía sau nên gõ được ngay, không phải chờ.

const PAD = {
  '--padding-start': '16px', '--padding-end': '16px',
  '--padding-top': '12px', '--padding-bottom': '16px',
} as CSSProperties;

const DEBOUNCE_MS = 130;   // đo được: tra 1–3 ms, nên chờ chừng này chỉ để gom phím, không phải để kịp tính
const LIMIT = 50;

type Phase = 'loading' | 'building' | 'ready';

export default function SearchPage() {
  const history = useHistory();
  const [phase, setPhase] = useState<Phase>('loading');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  // Index để trong STATE chứ không phải ref: đọc ref lúc render là sai (không kích hoạt vẽ lại,
  // và React đồng thời có thể đọc bản cũ). Đổi index chỉ xảy ra 1–2 lần mỗi lần vào màn.
  const [ix, setIx] = useState<SearchIndex | null>(null);
  // Dấu vân tay của lượt dựng gần nhất — để làm mới đối chiếu mà khỏi đọc lại IndexedDB.
  const stamps = useRef<Map<string, string> | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    (async () => {
      const cached = await loadIndex();
      if (!alive.current) return;
      if (cached) {
        setIx(cached.index);
        stamps.current = cached.stamps;
        setPhase('ready');
        // Làm mới NGẦM: kho có thể đã nhận file mới từ mini PC. Không chặn ô nhập.
        setRefreshing(true);
        try {
          const r = await refreshIndex(stamps.current ?? undefined);
          if (alive.current && r.changed && r.index) { setIx(r.index); stamps.current = r.stamps ?? null; }
        } catch { /* giữ index cũ — tìm trên bản cũ vẫn hơn không tìm được */ }
        if (alive.current) setRefreshing(false);
      } else {
        // Chưa có gì: dựng lần đầu, hiện tiến độ vì nó lâu.
        setPhase('building');
        try {
          const r = await refreshIndex(undefined, (p) => alive.current && setProgress(p));
          if (!alive.current) return;
          if (r.index) { setIx(r.index); stamps.current = r.stamps ?? null; }
        } catch { /* để ready với index rỗng → hiện "chưa tra được", không treo màn */ }
        if (alive.current) setPhase('ready');
      }
    })();
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    // Chưa có index thì không đặt state ở đây (đặt đồng bộ trong effect gây vẽ lại dây chuyền);
    // `hits` vốn đã rỗng và chỉ có một chiều null -> có index, không bao giờ ngược lại.
    if (!ix) return;
    const t = setTimeout(() => setHits(q.trim() ? search(ix, q, LIMIT) : []), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, ix]);

  const open = (pdfUri: string, page: number) =>
    history.push(`/viewer/${encodeUriParam(pdfUri)}?p=${page}`);

  const { exact, prefix } = parseQuery(q);
  const docCount = ix?.docs.length ?? 0;

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle className="gu-title">Tìm</IonTitle></IonToolbar></IonHeader>
      <IonContent style={PAD}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gu-white)',
          border: '1px solid var(--gu-grey)', borderRadius: 999, padding: '10px 16px',
        }}>
          <IonIcon icon={searchOutline} style={{ color: 'var(--gu-grey)', flex: '0 0 auto' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm trong tài liệu…"
            aria-label="Tìm trong tài liệu"
            enterKeyHint="search"
            autoCorrect="off" autoCapitalize="none" spellCheck={false}
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, color: 'var(--gu-brown-deep)', fontFamily: 'inherit',
            }}
          />
          {q && (
            <IonIcon
              icon={closeCircle} onClick={() => setQ('')} role="button" aria-label="Xoá ô tìm"
              style={{ color: 'var(--gu-grey)', flex: '0 0 auto', cursor: 'pointer', fontSize: 18 }}
            />
          )}
        </div>

        {phase === 'building' && <BuildingState done={progress.done} total={progress.total} />}

        {phase === 'ready' && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, margin: '10px 2px 4px',
              fontSize: 12, color: 'var(--gu-grey)', minHeight: 16,
            }}>
              {refreshing && <IonSpinner name="dots" style={{ width: 18, height: 12 }} />}
              {refreshing ? 'đang cập nhật chỉ mục…'
                : q.trim() ? `${hits.length}${hits.length >= LIMIT ? '+' : ''} đoạn khớp`
                  : `đã đọc ${docCount} tài liệu`}
            </div>

            {q.trim() && hits.length === 0 && !refreshing && (
              <Empty title="Không tìm thấy đoạn nào">
                Thử bớt chữ, hoặc gõ không dấu cũng được — “to tung” ra “Tố tụng”.
              </Empty>
            )}

            {!q.trim() && (
              <Empty title="Gõ để tìm trong toàn bộ kho">
                Tìm tới từng đoạn, chạm là mở đúng trang. Gõ có dấu hay không dấu đều được.
              </Empty>
            )}

            {hits.map((h, i) => (
              <ResultRow
                key={`${h.doc.pdfUri}#${h.unit.page}#${i}`}
                hit={h} exact={exact} prefix={prefix}
                onOpen={() => open(h.doc.pdfUri, h.unit.page)}
              />
            ))}
          </>
        )}
      </IonContent>
    </IonPage>
  );
}

function BuildingState({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ marginTop: '18vh', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 17, color: 'var(--gu-brown-deep)' }}>
        Đang đọc kho lần đầu nha dợ iu
      </div>
      <p style={{ color: 'var(--gu-grey)', fontSize: 13.5, lineHeight: 1.6, margin: '8px 0 16px' }}>
        Chỉ lâu lần này thôi, những lần sau mở là tìm được ngay. Iu lắm!
      </p>
      {/* Chạy bằng transform: scaleX chứ KHÔNG phải width — animate width bắt trình duyệt tính lại
          bố cục mỗi khung, mà thanh này nhích 178 lần trong lúc máy đang bận đọc kho. */}
      <div style={{ height: 6, borderRadius: 999, background: 'rgba(117,66,14,.14)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: '100%', background: 'var(--gu-brown)',
          transformOrigin: 'left center', transform: `scaleX(${pct / 100})`, transition: 'transform .2s',
        }} />
      </div>
      <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--gu-grey)', fontVariantNumeric: 'tabular-nums' }}>
        {done} / {total || '…'} tài liệu
      </div>
    </div>
  );
}

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '16vh', textAlign: 'center', padding: '0 24px' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%', background: 'rgba(117,66,14,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
      }}>
        <IonIcon icon={searchOutline} style={{ fontSize: 34, color: 'var(--gu-brown)' }} />
      </div>
      <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 17, color: 'var(--gu-brown-deep)' }}>
        {title}
      </div>
      <p style={{ color: 'var(--gu-grey)', fontSize: 13.5, lineHeight: 1.6, margin: '8px 0 0' }}>{children}</p>
    </div>
  );
}

function ResultRow({ hit, exact, prefix, onOpen }: {
  hit: Hit; exact: string[]; prefix: string | null; onOpen: () => void;
}) {
  const { unit, doc } = hit;
  const sn = makeSnippet(unit.text, exact, prefix);
  const pieces: React.ReactNode[] = [];
  let at = 0;
  sn.marks.forEach((m, i) => {
    if (m.start > at) pieces.push(sn.text.slice(at, m.start));
    pieces.push(<mark key={i} style={{ background: 'rgba(231,197,110,.55)', color: 'inherit', padding: 0 }}>
      {sn.text.slice(m.start, m.end)}
    </mark>);
    at = m.end;
  });
  if (at < sn.text.length) pieces.push(sn.text.slice(at));

  return (
    <div
      onClick={onOpen} role="button" aria-label={`Mở ${doc.name} tại trang ${unit.page}`}
      style={{
        background: 'var(--gu-white)', borderRadius: 10, padding: '12px 14px', marginBottom: 8,
        cursor: 'pointer', border: '1px solid rgba(117,66,14,.10)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <MonSwatch name={doc.mon} size={14} />
        <span style={{ fontSize: 12, color: 'var(--gu-grey)', flex: '0 0 auto' }}>{doc.mon}</span>
        <span style={{
          fontSize: 12.5, color: 'var(--gu-brown-deep)', fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{doc.name}</span>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--gu-brown-deep)' }}>
        {sn.cutHead && '… '}{pieces}{sn.cutTail && ' …'}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gu-brown)', fontVariantNumeric: 'tabular-nums' }}>
        {unit.label ? `${unit.label} · ` : ''}trang {unit.page}
      </div>
    </div>
  );
}
