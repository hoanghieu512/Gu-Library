import { describe, it, expect } from 'vitest';
import { viewerUrl, readViewerParams } from './viewerUrl';
import { encodeUriParam } from '../storage/uriParam';

describe('viewerUrl / readViewerParams', () => {
  it.each(['35%', '15/5', 'a & b #c ?', 'hợp đồng'])('q round-trips: %s', (q) => {
    const url = viewerUrl('content://x/a.pdf', { q });
    expect(url.startsWith(`/viewer/${encodeUriParam('content://x/a.pdf')}?`)).toBe(true);
    expect(readViewerParams(url.slice(url.indexOf('?'))).q).toBe(q);
  });

  it('page round-trips and parses like before: "0", "abc", missing → null; "38" → 38', () => {
    expect(readViewerParams(viewerUrl('content://x/a.pdf', { page: 38 }).split('?')[1]).page).toBe(38);
    expect(readViewerParams('?p=38').page).toBe(38);
    expect(readViewerParams('?p=0').page).toBeNull();
    expect(readViewerParams('?p=abc').page).toBeNull();
    expect(readViewerParams('').page).toBeNull();
  });

  it('empty q → null', () => {
    expect(readViewerParams('?q=').q).toBeNull();
    expect(readViewerParams('?p=3').q).toBeNull();
  });

  it('no options → bare viewer path', () => {
    expect(viewerUrl('content://x/a.pdf')).toBe(`/viewer/${encodeUriParam('content://x/a.pdf')}`);
  });

  it('a page or query link carries a fresh one-shot nonce; a bare link carries none', () => {
    const a = readViewerParams(viewerUrl('content://x/a.pdf', { q: 'hop dong' }).split('?')[1]);
    const b = readViewerParams(viewerUrl('content://x/a.pdf', { q: 'hop dong' }).split('?')[1]);
    expect(a.nonce).toBeTruthy();
    expect(a.nonce).not.toBe(b.nonce);
    expect(readViewerParams(viewerUrl('content://x/a.pdf', { page: 3 }).split('?')[1]).nonce).toBeTruthy();
    expect(readViewerParams('').nonce).toBeNull();
  });
});
