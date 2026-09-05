import { describe, it, expect } from 'vitest';
import { emptyIndex, addDoc, search, indexStats } from './invertedIndex';

// Đúng câu worker ghi vào sidecar cho trang ảnh — có đuôi số trang nên phải khớp TIỀN TỐ.
const MARK = (n: number) => `[trang ảnh scan — chưa có lớp văn bản] (trang ${n})`;
import type { SearchIndex } from './invertedIndex';

const DOC_A = { pdfUri: 'uri://a.pdf', name: 'Luật Đất đai', mon: 'Đất Đai' };
const DOC_B = { pdfUri: 'uri://b.pdf', name: 'Bài giảng HSPC', mon: 'Hình sự chung' };

function fixture(): SearchIndex {
  const ix = emptyIndex();
  addDoc(ix, DOC_A, {
    title: 'Luật Đất đai',
    units: [
      { label: 'Điều 5', page: 3, text: 'Người sử dụng đất được cấp giấy chứng nhận.' },
      { label: 'Điều 6', page: 4, text: 'Nguyên tắc sử dụng đất phải đúng quy hoạch.' },
    ],
  });
  addDoc(ix, DOC_B, {
    title: 'Bài giảng HSPC',
    units: [{ label: 'Slide 12', page: 12, text: 'Tội phạm và cấu thành tội phạm.' }],
  });
  return ix;
}

describe('addDoc', () => {
  it('gom mọi unit có chữ, giữ nhãn và trang để Viewer nhảy tới', () => {
    const s = indexStats(fixture());
    expect(s.docs).toBe(2);
    expect(s.units).toBe(3);
    expect(s.tokens).toBeGreaterThan(0);
  });

  it('BỎ QUA unit rỗng text — ảnh chưa OCR nằm ở đây, không được đếm là nội dung', () => {
    const ix = emptyIndex();
    addDoc(ix, DOC_A, { units: [{ label: '', page: 1, text: '' }, { label: '', page: 2 }] });
    expect(indexStats(ix).units).toBe(0);
  });

  it('sidecar hỏng / thiếu units → êm, không ném', () => {
    const ix = emptyIndex();
    expect(() => addDoc(ix, DOC_A, {})).not.toThrow();
    expect(() => addDoc(ix, DOC_A, { units: undefined })).not.toThrow();
    expect(indexStats(ix).units).toBe(0);
  });

  it('một token lặp trong cùng unit chỉ ghi MỘT posting', () => {
    const ix = emptyIndex();
    addDoc(ix, DOC_A, { units: [{ label: '', page: 1, text: 'đất đất đất đất' }] });
    expect(indexStats(ix).postings).toBe(1);
  });
});

describe('search', () => {
  it('gõ KHÔNG DẤU ra kết quả CÓ DẤU', () => {
    const hits = search(fixture(), 'giay chung nhan');
    expect(hits).toHaveLength(1);
    expect(hits[0].unit.label).toBe('Điều 5');
    expect(hits[0].unit.page).toBe(3);
    expect(hits[0].doc.name).toBe('Luật Đất đai');
  });

  it('AND: unit phải chứa ĐỦ mọi token', () => {
    const ix = fixture();
    expect(search(ix, 'sử dụng đất')).toHaveLength(2);       // cả Điều 5 và Điều 6
    expect(search(ix, 'sử dụng quy hoạch')).toHaveLength(1); // chỉ Điều 6
  });

  it('một token không có trong kho → rỗng, không quét gì thêm', () => {
    expect(search(fixture(), 'đất khủnglong')).toEqual([]);
  });

  it('truy vấn rỗng / chỉ dấu câu → rỗng', () => {
    expect(search(fixture(), '')).toEqual([]);
    expect(search(fixture(), '   ,;  ')).toEqual([]);
  });

  it('tra được qua nhiều tài liệu, trả đúng tài liệu chứa nó', () => {
    const hits = search(fixture(), 'toi pham');
    expect(hits).toHaveLength(1);
    expect(hits[0].doc.mon).toBe('Hình sự chung');
    expect(hits[0].unit.page).toBe(12);
  });

  it('tôn trọng limit', () => {
    expect(search(fixture(), 'dat', 1)).toHaveLength(1);
  });
});

describe('tra theo tiền tố (gõ tới đâu tìm tới đó)', () => {
  it('gõ dở chữ cuối vẫn ra kết quả', () => {
    const ix = fixture();
    expect(search(ix, 'chứng nh')).toHaveLength(1);      // "nh" là tiền tố của "nhận"
    expect(search(ix, 'ng')).not.toHaveLength(0);
  });

  it('token TRƯỚC token cuối phải khớp NGUYÊN, không phải tiền tố', () => {
    const ix = fixture();
    expect(search(ix, 'chứn nhận')).toEqual([]);          // "chứn" không phải token nguyên nào
  });

  it('tiền tố không khớp token nào → rỗng', () => {
    expect(search(fixture(), 'zzzz')).toEqual([]);
  });
});

describe('xếp hạng', () => {
  it('khớp NGUYÊN CỤM xếp trên khớp rời', () => {
    const ix = emptyIndex();
    addDoc(ix, DOC_A, {
      units: [
        { label: 'rời', page: 1, text: 'Quyền sử dụng và nghĩa vụ khi dùng đất canh tác.' },
        { label: 'nguyên cụm', page: 2, text: 'Người sử dụng đất có quyền chuyển nhượng.' },
      ],
    });
    const hits = search(ix, 'sử dụng đất');
    expect(hits[0].unit.label).toBe('nguyên cụm');
  });

  it('cùng điều kiện thì đơn vị NGẮN hơn xếp trên', () => {
    const ix = emptyIndex();
    const long = 'Hợp đồng ' + 'và các điều khoản kèm theo '.repeat(12);
    addDoc(ix, DOC_A, {
      units: [
        { label: 'dài', page: 1, text: long },
        { label: 'ngắn', page: 2, text: 'Hợp đồng dân sự.' },
      ],
    });
    expect(search(ix, 'hợp đồng')[0].unit.label).toBe('ngắn');
  });
});

describe('trang ảnh chưa OCR không phải là chữ', () => {
  it('KHÔNG index marker như nội dung (lỗi thật của v1.38.0)', () => {
    const ix = emptyIndex();
    addDoc(ix, DOC_A, {
      units: [
        { label: '', page: 1, text: MARK(1) },
        { label: '', page: 2, text: MARK(1) },
      ],
    });
    expect(indexStats(ix).units).toBe(0);
    expect(indexStats(ix).postings).toBe(0);
    expect(search(ix, 'trang anh scan')).toEqual([]);
    expect(search(ix, 'lop van ban')).toEqual([]);
  });

  it('đếm được tài liệu là ảnh scan, để còn nói cho người dùng biết', () => {
    const ix = emptyIndex();
    addDoc(ix, DOC_A, { units: [{ label: '', page: 1, text: MARK(1) }] });
    addDoc(ix, DOC_B, { units: [{ label: '', page: 1, text: 'Tội phạm và hình phạt.' }] });
    expect(indexStats(ix).imageOnly).toBe(1);
    expect(indexStats(ix).docs).toBe(2);
  });

  it('marker có khoảng trắng thừa vẫn bị loại', () => {
    const ix = emptyIndex();
    addDoc(ix, DOC_A, { units: [{ label: '', page: 1, text: `  ${MARK(3)}\n` }] });
    expect(indexStats(ix).units).toBe(0);
    expect(indexStats(ix).imageOnly).toBe(1);
  });

  it('sidecar KHÔNG có đơn vị nào thì KHÔNG tính là ảnh — đó là lỗi worker, ca khác', () => {
    const ix = emptyIndex();
    addDoc(ix, DOC_A, { units: [] });
    expect(indexStats(ix).imageOnly).toBe(0);
  });

  it('tài liệu có LẪN trang ảnh và trang chữ: giữ trang chữ, KHÔNG tính là ảnh', () => {
    const ix = emptyIndex();
    addDoc(ix, DOC_A, {
      units: [
        { label: '', page: 1, text: MARK(1) },
        { label: 'Điều 5', page: 2, text: 'Người sử dụng đất được cấp giấy chứng nhận.' },
      ],
    });
    expect(indexStats(ix).units).toBe(1);
    expect(indexStats(ix).imageOnly).toBe(0);
    expect(search(ix, 'giay chung nhan')[0].unit.page).toBe(2);
  });
});
