import { describe, it, expect } from 'vitest';
import { encodeUriParam, decodeUriParam } from './uriParam';

describe('uriParam round-trip', () => {
  it('round-trips a realistic SAF tree/document content URI', () => {
    const uri =
      'content://com.android.externalstorage.documents/tree/primary%3ADownload%2Fkho/document/primary%3ADownload%2Fkho%2FT%E1%BB%91%20t%E1%BB%A5ng%20H%C3%ACnh%20s%E1%BB%B1';
    const p = encodeUriParam(uri);
    expect(p).not.toMatch(/[%/+=]/); // an toàn cho URL path, không có ký tự router sẽ decode
    expect(decodeUriParam(p)).toBe(uri);
  });
  it('round-trips plain ascii', () => {
    expect(decodeUriParam(encodeUriParam('content://x/y'))).toBe('content://x/y');
  });
});
