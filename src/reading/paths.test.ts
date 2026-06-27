import { describe, it, expect } from 'vitest';
import { relPathFromUris } from './paths';
const ROOT = 'content://com.android.externalstorage.documents/tree/primary%3ADownload%2Fkho';
const DOC = ROOT + '/document/primary%3ADownload%2Fkho%2FLu%E1%BA%ADt%20C%C3%B4ng%20ch%E1%BB%A9ng%2FDAC.pdf';
describe('relPathFromUris', () => {
  it('trả đường dẫn tương đối đầy đủ trong kho', () => {
    expect(relPathFromUris(ROOT, DOC)).toBe('Luật Công chứng/DAC.pdf');
  });
  it('doc ngoài kho → null', () => {
    expect(relPathFromUris(ROOT, 'content://x/tree/other/document/other%2Ffile.pdf')).toBeNull();
  });
});
