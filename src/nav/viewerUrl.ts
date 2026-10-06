import { encodeUriParam } from '../storage/uriParam';

// Viewer route with its two optional query params, built and read in ONE place:
//   ?p=N — open straight at page N (a search hit)
//   ?q=… — open with "Tìm trong tài liệu này" already holding this query (v1.41.0 "Xem cả N đoạn")
//   &t=… — one-shot nonce on every page/query link: Ionic remembers each tab's last URL and may
//          re-enter a living Viewer with it, so the Viewer acts on a nonce only once.
// URLSearchParams does the escaping, so queries like "35%", "15/5" or "a & b #c" survive the trip.

let seq = 0;

export function viewerUrl(pdfUri: string, opts: { page?: number; q?: string } = {}): string {
  const params = new URLSearchParams();
  if (opts.page != null) params.set('p', String(opts.page));
  if (opts.q) params.set('q', opts.q);
  if (opts.page != null || opts.q) params.set('t', `${Date.now().toString(36)}${(++seq).toString(36)}`);
  const qs = params.toString();
  return `/viewer/${encodeUriParam(pdfUri)}${qs ? `?${qs}` : ''}`;
}

export function readViewerParams(search: string): { page: number | null; q: string | null; nonce: string | null } {
  const params = new URLSearchParams(search);
  const p = Number(params.get('p'));
  const q = params.get('q');
  return { page: Number.isFinite(p) && p > 0 ? p : null, q: q ? q : null, nonce: params.get('t') || null };
}
