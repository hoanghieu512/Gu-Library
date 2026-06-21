import { describe, it, expect } from 'vitest';
import { parseMonMeta } from './monjson';

describe('parseMonMeta', () => {
  it('reads color and order when present', () => {
    expect(parseMonMeta('{"color":"#75420E","order":2}')).toEqual({ color: '#75420E', order: 2 });
  });
  it('returns empty object for missing fields', () => {
    expect(parseMonMeta('{}')).toEqual({});
  });
  it('ignores wrong-typed fields', () => {
    expect(parseMonMeta('{"color":123,"order":"x"}')).toEqual({});
  });
  it('returns empty object on invalid JSON instead of throwing', () => {
    expect(parseMonMeta('not json')).toEqual({});
  });
  it('keeps only known fields', () => {
    expect(parseMonMeta('{"color":"#000","order":1,"junk":true}')).toEqual({ color: '#000', order: 1 });
  });
  it('reads optional icon override', () => {
    expect(parseMonMeta('{"icon":"Đ","color":"#3F6B2E"}')).toEqual({ icon: 'Đ', color: '#3F6B2E' });
  });
  it('ignores non-string icon', () => {
    expect(parseMonMeta('{"icon":5}')).toEqual({});
  });
});
