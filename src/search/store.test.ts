import { describe, it, expect } from 'vitest';
import { stampOf } from './store';
import { indexDoc, mergeShards, search } from './invertedIndex';

const DOC_A = { pdfUri: 'uri://a.pdf', name: 'Luật Đất đai', mon: 'Đất Đai' };
const DOC_B = { pdfUri: 'uri://b.pdf', name: 'Bài giảng', mon: 'Hình sự chung' };

describe('stampOf — dấu vân tay sidecar', () => {
  it('có đủ size + lastModified thì ghép thành dấu', () => {
    expect(stampOf({ size: 1200, lastModified: 1717000000000 })).toBe('1200:1717000000000');
  });

  it('THIẾU cột → chuỗi rỗng, để chỗ so sánh luôn thấy khác nhau và đọc lại', () => {
    // Hai file cùng "không biết" KHÔNG được coi là giống nhau — đây là chỗ dễ sai nhất.
    expect(stampOf({ size: -1, lastModified: -1 })).toBe('');
    expect(stampOf({ size: 10, lastModified: -1 })).toBe('');
    expect(stampOf({ size: undefined, lastModified: undefined })).toBe('');
    expect(stampOf(undefined)).toBe('');
    expect(stampOf({ size: -1, lastModified: -1 }) === stampOf({ size: -1, lastModified: -1 })).toBe(true);
    // ...nhưng chuỗi rỗng bị luật "stamp !== ''" ở refreshIndex loại ra, nên vẫn đọc lại.
  });
});

describe('mergeShards — gộp mảnh không tách từ lại', () => {
  const shA = indexDoc(DOC_A, {
    units: [
      { label: 'Điều 5', page: 3, text: 'Người sử dụng đất được cấp giấy chứng nhận.' },
      { label: 'Điều 6', page: 4, text: 'Nguyên tắc sử dụng đất.' },
    ],
  });
  const shB = indexDoc(DOC_B, { units: [{ label: 'Slide 2', page: 2, text: 'Tội phạm và hình phạt.' }] });

  it('gộp xong tra được xuyên tài liệu', () => {
    const ix = mergeShards([shA, shB]);
    expect(search(ix, 'giay chung nhan')[0].doc.name).toBe('Luật Đất đai');
    expect(search(ix, 'toi pham')[0].doc.name).toBe('Bài giảng');
  });

  it('ĐỔI THỨ TỰ mảnh không làm sai posting (mốc đơn vị cộng đúng)', () => {
    const ix = mergeShards([shB, shA]);
    const hit = search(ix, 'giay chung nhan')[0];
    expect(hit.doc.name).toBe('Luật Đất đai');
    expect(hit.unit.page).toBe(3);
    expect(hit.unit.label).toBe('Điều 5');
  });

  it('bỏ một mảnh = tài liệu đó biến mất khỏi kết quả', () => {
    const ix = mergeShards([shB]);
    expect(search(ix, 'giay chung nhan')).toEqual([]);
    expect(search(ix, 'toi pham')).toHaveLength(1);
  });

  it('mảnh dùng chỉ số CỤC BỘ — gộp lại vẫn trỏ đúng đơn vị', () => {
    const ix = mergeShards([shA, shB]);
    for (const u of ix.units) expect(ix.docs[u.d]).toBeDefined();
    expect(ix.units.filter((u) => u.d === 1)).toHaveLength(1);
  });

  it('gộp lại cho kết quả GIỐNG HỆT dựng một lượt', () => {
    const merged = mergeShards([shA, shB]);
    const one = mergeShards([indexDoc(DOC_A, {
      units: [
        { label: 'Điều 5', page: 3, text: 'Người sử dụng đất được cấp giấy chứng nhận.' },
        { label: 'Điều 6', page: 4, text: 'Nguyên tắc sử dụng đất.' },
      ],
    }), shB]);
    expect(merged.postings.size).toBe(one.postings.size);
    expect(merged.units.length).toBe(one.units.length);
  });
});
