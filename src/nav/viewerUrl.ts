import { encodeUriParam } from '../storage/uriParam';

// Viewer route with its two optional query params, built and read in ONE place:
//   ?p=N — open straight at page N (a search hit)
//   ?q=… — open with "Tìm trong tài liệu này" already holding this query (v1.41.0 "Xem cả N đoạn")
// URLSearchParams does the escaping, so queries like "35%", "15/5" or "a & b #c" survive the trip.

export function viewerUrl(pdfUri: string, opts: { page?: number; q?: string } = {}): string {
  const params = new URLSearchParams();
  if (opts.page != null) params.set('p', String(opts.page));
  if (opts.q) params.set('q', opts.q);
  const qs = params.toString();
  return `/viewer/${encodeUriParam(pdfUri)}${qs ? `?${qs}` : ''}`;
}

export function readViewerParams(search: string): { page: number | null; q: string | null } {
  const params = new URLSearchParams(search);
  const p = Number(params.get('p'));
  const q = params.get('q');
  return { page: Number.isFinite(p) && p > 0 ? p : null, q: q ? q : null };
}
