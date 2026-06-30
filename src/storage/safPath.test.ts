import { describe, it, expect } from 'vitest';
import { readableTreePath } from './safPath';

describe('readableTreePath', () => {
  it('bỏ tiền tố volume primary + giải mã %', () => {
    expect(readableTreePath('content://com.android.externalstorage.documents/tree/primary%3ADownload%2Fkho'))
      .toBe('Download/kho');
  });
  it('giữ đường dẫn lồng nhiều cấp', () => {
    expect(readableTreePath('content://com.android.externalstorage.documents/tree/primary%3ADownload%2Fkho%2Fsub'))
      .toBe('Download/kho/sub');
  });
  it('volume khác (thẻ SD) cũng bỏ tiền tố', () => {
    expect(readableTreePath('content://x/tree/ABCD-1234%3AStuff')).toBe('Stuff');
  });
  it('không có /tree/ → trả nguyên', () => {
    expect(readableTreePath('content://weird/uri')).toBe('content://weird/uri');
  });
});
