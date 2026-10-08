import { test } from 'node:test';
import { deepEqual, equal, throws } from 'node:assert/strict';
import { parseXemCa, parseOpenAtPage, parsePageFooter, uniqueCardFrom } from '../lib/parse.ts';

test('parseXemCa reads count with thousands dot and the name', () =>
  deepEqual(parseXemCa('Xem cả 1.489 đoạn trong 91_2015_QH13_296215'), { count: 1489, name: '91_2015_QH13_296215' }));

test('parseOpenAtPage', () =>
  deepEqual(parseOpenAtPage('Mở Hop_dong_Chuong_1_2_4 tại trang 24'), { name: 'Hop_dong_Chuong_1_2_4', page: 24 }));

test('parsePageFooter', () => deepEqual(parsePageFooter('Trang 24 / 38'), { page: 24, total: 38 }));

test('non-matching labels → null', () => {
  equal(parseXemCa('Mở X tại trang 2'), null);
  equal(parseOpenAtPage('Xem cả 3 đoạn trong X'), null);
  equal(parsePageFooter('Tới trang…'), null);
});

const LABELS = ['Tạo môn mới', 'Mở A tại trang 3', 'Xem cả 12 đoạn trong A', 'Mở B tại trang 1', 'Xem cả 1.004 đoạn trong B'];

test('uniqueCardFrom pairs the first card', () => deepEqual(uniqueCardFrom(LABELS), { name: 'A', page: 3, count: 12 }));

test('uniqueCardFrom index 1 → second card', () => deepEqual(uniqueCardFrom(LABELS, 1), { name: 'B', page: 1, count: 1004 }));

test('no result at all → says the query has no result', () =>
  throws(() => uniqueCardFrom(['Tạo môn mới']), /câu tra mẫu không còn kết quả/));

test('results with only one-match cards → says no card has Xem cả, not "no result"', () =>
  throws(() => uniqueCardFrom(['Mở A tại trang 3', 'Mở B tại trang 5']), (e: Error) =>
    /0 thẻ có nút "Xem cả"/.test(e.message) && !/không còn kết quả/.test(e.message)));

test('fewer Xem cả cards than the index asks → names how many there are', () =>
  throws(() => uniqueCardFrom(LABELS, 2), /2 thẻ có nút "Xem cả".*thẻ thứ 3/));

test('uniqueCardFrom skips cards whose Xem cả label appears twice (same file in two subjects)', () => {
  const dup = ['Mở A tại trang 3', 'Xem cả 12 đoạn trong A', 'Mở B tại trang 2', 'Xem cả 287 đoạn trong B',
    'Mở B tại trang 2', 'Xem cả 287 đoạn trong B', 'Mở C tại trang 12', 'Xem cả 39 đoạn trong C'];
  deepEqual(uniqueCardFrom(dup, 1), { name: 'C', page: 12, count: 39 });
  deepEqual(uniqueCardFrom(dup, 0), { name: 'A', page: 3, count: 12 });
});

test('every Xem cả card duplicated → says the labels repeat, not "no result"', () =>
  throws(() => uniqueCardFrom(['Mở B tại trang 2', 'Xem cả 2 đoạn trong B', 'Mở B tại trang 2', 'Xem cả 2 đoạn trong B'], 0),
    (e: Error) => /trùng nhãn/.test(e.message) && !/không còn kết quả/.test(e.message)));
