import { describe, it, expect } from 'vitest';
import { fold, tokenize } from './tokenize';

describe('fold', () => {
  it('bỏ dấu thanh và dấu mũ', () => {
    expect(fold('Tố tụng Hình sự')).toBe('to tung hinh su');
    expect(fold('Hiến pháp')).toBe('hien phap');
  });

  it('đ/Đ thành d — NFD KHÔNG xử được vì nó là ký tự riêng, không phải chữ có dấu', () => {
    expect(fold('Đất đai')).toBe('dat dai');
    expect(fold('NĐ-CP')).toBe('nd-cp');
  });

  it('gõ không dấu khớp được chuỗi có dấu (yêu cầu gốc của search)', () => {
    expect(fold('to tung hinh su')).toBe(fold('Tố tụng Hình sự'));
    expect(fold('dat dai')).toBe(fold('ĐẤT ĐAI'));
  });

  it('không đụng chữ Latin thường và số', () => {
    expect(fold('PLCTKD 2024')).toBe('plctkd 2024');
  });
});

describe('tokenize', () => {
  it('cắt theo khoảng trắng và dấu câu', () => {
    expect(tokenize('Tố tụng Hình sự')).toEqual(['to', 'tung', 'hinh', 'su']);
  });

  it('GIỮ số — tra cứu luật sống bằng số', () => {
    expect(tokenize('Điều 5')).toEqual(['dieu', '5']);
    expect(tokenize('khoản 2 Điều 15')).toEqual(['khoan', '2', 'dieu', '15']);
  });

  it('số hiệu văn bản tách thành các mảnh tra được', () => {
    expect(tokenize('Nghị định 23/2015/NĐ-CP')).toEqual(['nghi', 'dinh', '23', '2015', 'nd', 'cp']);
  });

  it('chuỗi rỗng / chỉ dấu câu → không ra token nào', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('  —  ,;  ')).toEqual([]);
  });

  it('câu truy vấn và câu trong tài liệu ra CÙNG token', () => {
    expect(tokenize('dieu 5 luat dat dai')).toEqual(tokenize('Điều 5 Luật Đất đai'));
  });
});
