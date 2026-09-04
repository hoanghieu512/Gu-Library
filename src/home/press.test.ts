import { describe, it, expect } from 'vitest';
import {
  paperHeight, pressLayout, PAPER_MAX, PAPER_CAP, BASE_TOP, HEAD_H, BEAM_BOTTOM, PRESS_W, PRESS_H,
  PLATE_FONT_NAME, PLATE_FONT_COUNT, PLATE_RECT_W, PLATE_VIEW_W,
  PLATE_Y, PLATE_RECT_H, INK_TOP, INK_BOTTOM,
} from './press';

describe('paperHeight', () => {
  it('không tài liệu thì không có giấy', () => {
    expect(paperHeight(0)).toBe(0);
  });

  it('tăng đều tới trần rồi dừng', () => {
    expect(paperHeight(PAPER_CAP)).toBe(PAPER_MAX);
    expect(paperHeight(PAPER_CAP + 1)).toBe(PAPER_MAX);
    expect(paperHeight(500)).toBe(PAPER_MAX);
  });

  it('liên tục — 1 với 2 tài liệu KHÁC nhau (bản SVG cũ gộp chung một nấc)', () => {
    expect(paperHeight(2)).toBeGreaterThan(paperHeight(1));
    expect(paperHeight(4)).toBeGreaterThan(paperHeight(3));
  });

  it('số âm coi như không có tài liệu', () => {
    expect(paperHeight(-3)).toBe(0);
  });
});

describe('pressLayout', () => {
  it('không giấy thì bàn ép nằm SÁT mặt đế', () => {
    const { headTop, paperH } = pressLayout(0);
    expect(paperH).toBe(0);
    expect(headTop + HEAD_H).toBeCloseTo(BASE_TOP, 5);
  });

  it('bàn ép luôn đội đúng trên xấp giấy', () => {
    for (const n of [1, 2, 5, 8, 40]) {
      const { headTop, paperH } = pressLayout(n);
      expect(headTop + HEAD_H + paperH).toBeCloseTo(BASE_TOP, 5);
    }
  });

  it('bàn ép nâng dần lên khi thêm tài liệu, không bao giờ tụt xuống', () => {
    const tops = [0, 1, 2, 3, 5, 8, 20].map((n) => pressLayout(n).headTop);
    for (let i = 1; i < tops.length; i++) expect(tops[i]).toBeLessThanOrEqual(tops[i - 1]);
  });

  it('không giấy thì không vẽ vạch tờ', () => {
    expect(pressLayout(0).sheets).toBe(0);
    expect(pressLayout(1).sheets).toBeGreaterThan(0);
  });

  it('trục vít KHÔNG BAO GIỜ co về 0 — ảnh ren cần chỗ để lặp', () => {
    for (const n of [0, 1, 4, 8, 100]) expect(pressLayout(n).rodH).toBeGreaterThan(0);
  });

  it('bàn ép luôn nằm dưới xà, không chọc lên trên', () => {
    for (const n of [0, 1, 8, 100]) expect(pressLayout(n).headTop).toBeGreaterThan(BEAM_BOTTOM);
  });
});

describe('khổ máy ép', () => {
  it('bề rộng = ĐÚNG khổ SVG cũ (83) → packShelves xếp y như trước', () => {
    // Không phải số làm đẹp: đo trên máy 6GB, kho QA còn ~90px ở tầng 2. 122 và 88 đều
    // bị đẩy xuống một tầng gần như trống; 83 vào đúng chỗ cũ.
    expect(PRESS_W).toBe(83);
  });

  it('mọi toạ độ nằm trong khung — không có mảnh nào tràn ra ngoài', () => {
    expect(BASE_TOP).toBeLessThan(PRESS_H);
    expect(BEAM_BOTTOM).toBeGreaterThan(0);
    expect(PAPER_MAX).toBeLessThan(BASE_TOP - BEAM_BOTTOM);
  });
});

describe('bảng đồng', () => {
  // Bẫy đã cắn thật: đặt chữ 4.4px bằng CSS, WebView nâng lên ~8px rồi chữ tràn khỏi bảng.
  // Bảng nay vẽ bằng SVG có viewBox nên cỡ chữ tính bằng user unit, phải ở trên ngưỡng kẹp 8.
  it('cỡ chữ (user unit) ở trên ngưỡng kẹp 8 của WebView', () => {
    expect(PLATE_FONT_NAME).toBeGreaterThan(8);
    expect(PLATE_FONT_COUNT).toBeGreaterThan(8);
  });

  it('chuỗi dài nhất vẫn nằm gọn trong bảng', () => {
    // ước lượng thô: serif đậm ~0.62 em mỗi ký tự — đủ chặt để bắt lỗi tràn
    const widest = 'Chưa phân loại'.length * PLATE_FONT_NAME * 0.62;
    expect(widest).toBeLessThan(PLATE_RECT_W);
  });

  it('hai dòng chữ nằm GỌN trong bảng theo chiều dọc', () => {
    // Đã sai thật: khối chữ cao hơn bảng thì phép căn giữa ra số âm, nét trên chọc lên khỏi mép.
    expect(INK_TOP).toBeGreaterThan(PLATE_Y);
    expect(INK_BOTTOM).toBeLessThan(PLATE_Y + PLATE_RECT_H);
  });

  it('bảng nằm trong bề ngang máy ép', () => {
    expect(PLATE_RECT_W).toBeLessThan(PLATE_VIEW_W);
  });
});
