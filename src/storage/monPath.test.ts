import { describe, it, expect } from 'vitest';
import { monNameFromUris } from './monPath';

const ROOT = 'content://com.android.externalstorage.documents/tree/primary%3ADownload%2Fkho';

describe('monNameFromUris', () => {
  it('extracts mon from a deeply-nested document URI', () => {
    const doc =
      'content://com.android.externalstorage.documents/tree/primary%3ADownload%2Fkho/document/primary%3ADownload%2Fkho%2FT%E1%BB%91%20t%E1%BB%A5ng%20H%C3%ACnh%20s%E1%BB%B1%2FCh%C6%B0%C6%A1ng%201%2FBu%E1%BB%95i%202%2Fslide.pdf';
    expect(monNameFromUris(ROOT, doc)).toBe('Tố tụng Hình sự');
  });
  it('extracts mon for a document directly inside the mon folder', () => {
    const doc =
      'content://com.android.externalstorage.documents/tree/primary%3ADownload%2Fkho/document/primary%3ADownload%2Fkho%2FLu%E1%BA%ADt%20C%C3%B4ng%20ch%E1%BB%A9ng%2Fluat.pdf';
    expect(monNameFromUris(ROOT, doc)).toBe('Luật Công chứng');
  });
  it('returns empty string when doc is outside the root', () => {
    const doc = 'content://com.android.externalstorage.documents/tree/primary%3ADownload%2Fother/document/primary%3ADownload%2Fother%2Ffile.pdf';
    expect(monNameFromUris(ROOT, doc)).toBe('');
  });
});
