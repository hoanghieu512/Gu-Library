import { describe, it, expect } from 'vitest';
import { sortMons } from './sortMon';
import type { Mon } from './types';
const m = (name: string, order?: number): Mon => ({ name, uri: 'u:' + name, meta: order === undefined ? {} : { order } });

describe('sortMons', () => {
  it('order tăng dần trước, rồi alphabet vi', () => {
    expect(sortMons([m('B', 2), m('A', 1), m('Zỹ')]).map((x) => x.name)).toEqual(['A', 'B', 'Zỹ']);
  });
  it('"Chưa phân loại" LUÔN cuối, bất kể order/alphabet', () => {
    const r = sortMons([m('Chưa phân loại', 1), m('Tố tụng', 5), m('An')]);
    expect(r[r.length - 1].name).toBe('Chưa phân loại');
  });
});
