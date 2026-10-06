import { describe, it, expect } from 'vitest';
import { emptyIndex, addDoc, search, indexStats, displayLabel, indexDoc } from './invertedIndex';

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

  it('nhiều chữ phải LIỀN NHAU, không phải chỉ "có đủ chữ"', () => {
    // Đổi từ v1.39.2 sau khi Gú kêu: trước đây đoạn nào chứa đủ các chữ ở BẤT KỲ đâu cũng khớp,
    // nên tra "là công dân" lọt cả "…LÀ lỗi do sai sót… ĐÁNH máy… văn bản CÔNG chứng".
    const ix = fixture();
    expect(search(ix, 'sử dụng đất')).toHaveLength(2);       // liền nhau ở cả Điều 5 và Điều 6
    // "sử dụng … quy hoạch" nằm rời trong Điều 6 → nay KHÔNG còn tính là khớp.
    expect(search(ix, 'sử dụng quy hoạch')).toEqual([]);
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

describe('bắt buộc LIỀN NHAU khi tra nhiều chữ (lỗi Gú gặp ở v1.39.0)', () => {
  function ix2() {
    const ix = emptyIndex();
    addDoc(ix, DOC_A, {
      units: [
        { label: 'Khoản 1', page: 6, text: '1. Là công dân Việt Nam không quá 70 tuổi;' },
        { label: 'Khoản 1', page: 40, text: '1. Lỗi kỹ thuật là lỗi do sai sót trong khi ghi chép, đánh máy, in ấn văn bản công chứng.' },
        { label: '', page: 21, text: 'điều ước quốc tế mà Cộng hòa xã hội chủ nghĩa Việt Nam là thành viên' },
      ],
    });
    return ix;
  }

  it('chỉ trả đoạn có NGUYÊN CỤM, bỏ đoạn có đủ chữ nhưng nằm rời', () => {
    const hits = search(ix2(), 'la cong dan');
    expect(hits).toHaveLength(1);
    expect(hits[0].unit.page).toBe(6);
  });

  it('gõ CÓ DẤU cũng vậy — "cộng" không còn lọt vào chỗ tra "công"', () => {
    const hits = search(ix2(), 'là công dân');
    expect(hits.map((h) => h.unit.page)).toEqual([6]);
  });

  it('MỘT chữ thì vẫn tra rộng như cũ (không áp luật cụm)', () => {
    expect(search(ix2(), 'cong').length).toBeGreaterThan(1);
  });

  it('dấu câu và xuống dòng KHÔNG cắt cụm', () => {
    const ix = emptyIndex();
    addDoc(ix, DOC_A, { units: [{ label: '', page: 1, text: 'Người đó là,\ncông dân hợp pháp' }] });
    expect(search(ix, 'la cong dan')).toHaveLength(1);
  });

  it('cụm phải đúng THỨ TỰ — đảo chữ thì không khớp', () => {
    expect(search(ix2(), 'dan cong la')).toEqual([]);
  });

  it('token cuối vẫn khớp TIỀN TỐ để gõ tới đâu tìm tới đó', () => {
    expect(search(ix2(), 'la cong d')).toHaveLength(1);
    expect(search(ix2(), 'la công dâ')).toHaveLength(1);
  });
});

describe('phrase check is cheap without any cap', () => {
  it('kho lớn toàn đoạn KHÔNG khớp cụm vẫn trả về nhanh, không quét hết', () => {
    const ix = emptyIndex();
    // 5000 đoạn đều chứa ĐỦ "là" + "công" + "dân" nhưng KHÔNG liền cụm → qua được phép giao
    // rẻ tiền, nên đoạn nào cũng phải tách từ. Không có trần thì mỗi phím gõ tách từ đủ 5000 đoạn.
    const units = Array.from({ length: 5000 }, (_, i) => ({
      label: '', page: i + 1,
      text: 'Đây là một đoạn dài nói về công tác của người dân trong thực tiễn số ' + i,
    }));
    addDoc(ix, DOC_A, { units });
    const t0 = Date.now();
    expect(search(ix, 'la cong dan')).toEqual([]);
    expect(Date.now() - t0).toBeLessThan(400);
  });
});

describe('nhãn kết quả mang Điều chứa nó (v1.40.0)', () => {
  // "Khoản 2 · trang 38" không nói khoản đó của Điều nào — trong một luật Điều nào cũng có Khoản 2.
  it.each([
    ['Khoản 1', ['Chương I', 'Điều 2'], 'Khoản 1 · Điều 2'],
    ['Khoản 2', ['Điều 2'], 'Khoản 2 · Điều 2'],
    ['Điểm a', ['Chương I', 'Điều 5', 'Khoản 2'], 'Điểm a · Khoản 2 · Điều 5'],
    ['', ['Chương I', 'Điều 7'], 'Điều 7'],
    // Không có Điều phía trên → giữ nguyên, không kéo Chương vào làm rối nhãn.
    ['Điều 1', ['Chương I'], 'Điều 1'],
    ['', ['Chương I'], ''],
    ['Slide 12', [], 'Slide 12'],
    // Worker đôi khi để chính đơn vị trong path, hoặc path lạ (heading "Chương II" dưới "Chương I").
    ['Điều 28', ['Chương V', 'Điều 28'], 'Điều 28'],
    ['Chương II', ['Chương I'], 'Chương II'],
  ])('%s + %j → "%s"', (label, path, want) => {
    expect(displayLabel(label, path)).toBe(want);
  });

  it('path thiếu hoặc hỏng → chỉ còn nhãn gốc, không ném', () => {
    expect(displayLabel('Khoản 3', undefined)).toBe('Khoản 3');
    expect(displayLabel('Khoản 3', 'Điều 2' as unknown as string[])).toBe('Khoản 3');
  });

  it('nhãn ghép đi tới tận kết quả tra', () => {
    const ix = emptyIndex();
    addDoc(ix, DOC_A, {
      units: [{ type: 'khoan', label: 'Khoản 2', path: ['Chương I', 'Điều 2'], page: 38, text: 'Quyết định về đặc xá.' }],
    });
    expect(search(ix, 'dac xa', 10)[0].unit.label).toBe('Khoản 2 · Điều 2');
  });
});

describe('ký hiệu dính vào chữ/số phải khớp ĐÚNG (v1.40.1 — huynh bắt được)', () => {
  // Trước: bộ tách từ vứt mọi ký hiệu → "35%" chỉ còn token `35` (tiền tố) → ra cả 35, 350, 135…
  // "15/5" và "15.5" thành CÙNG một cụm `15 5`.
  const DOC = { pdfUri: 'uri://ldn.pdf', name: 'Luật doanh nghiệp 2020', mon: 'PLCTKD' };
  function ix() {
    const x = emptyIndex();
    addDoc(x, DOC, {
      units: [
        { label: 'A', page: 1, text: 'Khoản 35 Điều 4.' },
        { label: 'B', page: 2, text: 'Vốn điều lệ 350 tỷ đồng.' },
        { label: 'C', page: 3, text: 'Cổ đông sở hữu ít nhất 35% vốn điều lệ.' },
        { label: 'D', page: 4, text: 'Tỷ lệ 135% so với năm trước.' },
        { label: 'E', page: 5, text: 'Giá trị từ 35 % tổng tài sản.' },
        { label: 'F', page: 6, text: 'Nghị quyết số 02/2018 ngày 15/5/2018.' },
        { label: 'G', page: 7, text: '15.5. Phẫu thuật nối túi mật.' },
        { label: 'H', page: 8, text: 'Kích thước 15,5cm.' },
        { label: 'I', page: 9, text: 'Thông tư 15/2015/TT-BCA.' },
        { label: 'J', page: 10, text: 'Có 15 ngày để khiếu nại.' },
      ],
    });
    return x;
  }
  const labels = (q: string) => search(ix(), q, 50).map((h) => h.unit.label).sort();

  it.each([
    ['35%', ['C', 'E']],                 // "35 %" có dấu cách vẫn tính; 35, 350, 135% thì không
    ['15/5', ['F']],                     // không còn lẫn 15.5 và 15,5cm
    ['15.5', ['G']],
    ['15,5', ['H']],
    ['15/', ['F', 'I']],                 // 15/5/2018 và 15/2015 — không phải số 15 trơn
    ['tt-bca', ['I']],
  ])('"%s" → %j', (q, want) => {
    expect(labels(q)).toEqual(want);
  });

  it.each([
    ['.', []],                           // dấu câu đứng một mình: không có chữ để tra → rỗng như cũ
    [',', []],
  ])('"%s" đứng một mình → rỗng', (q, want) => {
    expect(labels(q)).toEqual(want);
  });

  it.each([
    ['dieu 4.', 'dieu 4'],               // dấu câu cuối câu: bỏ qua, tra như không có
    ['khoan 35,', 'khoan 35'],
    ['“dieu 4”', 'dieu 4'],              // ngoặc kép không phải ký hiệu có nghĩa
  ])('"%s" tra y như "%s"', (q, same) => {
    expect(labels(q)).toEqual(labels(same));
    expect(labels(q).length).toBeGreaterThan(0);
  });

  it('đoạn có ký hiệu nằm SAU 600 ứng viên trong kho vẫn tìm ra (trần không còn cắt theo thứ tự kho)', () => {
    const x = emptyIndex();
    for (let i = 0; i < 8; i++) {
      addDoc(x, { pdfUri: `uri://filler${i}.pdf`, name: `Filler ${i}`, mon: 'A' }, {
        units: Array.from({ length: 100 }, (_, k) => ({ label: '', page: k + 1, text: `Trang 35 dòng ${k}.` })),
      });
    }
    addDoc(x, DOC, { units: [{ label: 'Khoản 2', page: 9, text: 'Sở hữu ít nhất 35% vốn điều lệ.' }] });
    const hits = search(x, '35%', 50);
    expect(hits.map((h) => h.doc.name)).toEqual(['Luật doanh nghiệp 2020']);
  });
});

describe('n + exact phrase match, no kho-order cut (v1.41.0)', () => {
  it('indexDoc builds n: folded tokens, one space apart, leading space', () => {
    const sh = indexDoc(DOC_A, { units: [{ label: '', page: 1, text: 'Đất đai — 35% (Điều 5).\nHợp đồng' }] });
    expect(sh.units[0].n).toBe(' dat dai 35 dieu 5 hop dong');
  });

  it('"phù hợp … cộng đồng" does not match "hop dong"', () => {
    const ix = emptyIndex();
    addDoc(ix, DOC_A, { units: [{ label: '', page: 1, text: 'Phù hợp với cộng đồng dân cư.' }] });
    expect(search(ix, 'hop dong')).toEqual([]);
  });

  it('no kho-order cut: 700 hits in the first doc + 1 in the last doc → all 701 returned', () => {
    const ix = emptyIndex();
    addDoc(ix, DOC_A, { units: Array.from({ length: 700 }, (_, i) => ({ label: '', page: i + 1, text: `Hợp đồng số ${i}` })) });
    addDoc(ix, DOC_B, { units: [{ label: '', page: 9, text: 'Hợp đồng cuối kho' }] });
    const hits = search(ix, 'hop dong');
    expect(hits).toHaveLength(701);
    expect(hits.some((h) => h.doc.pdfUri === DOC_B.pdfUri)).toBe(true);
  });

  it('single-letter prefix over 50k units stays under 400 ms', () => {
    const ix = emptyIndex();
    addDoc(ix, DOC_A, { units: Array.from({ length: 50_000 }, (_, i) => ({ label: '', page: i + 1, text: `đoạn ${i} về dân sự` })) });
    const t0 = performance.now();
    expect(search(ix, 'd').length).toBe(50_000);
    expect(performance.now() - t0).toBeLessThan(400);
  });
});
