import { test } from 'node:test';
import { deepEqual, equal, throws } from 'node:assert/strict';
import { parseXemCa, parseOpenAtPage, parsePageFooter, parseResume, uniqueCardFrom } from '../lib/parse.ts';

test('parseXemCa reads count with thousands dot, the name and the subject', () =>
  deepEqual(parseXemCa('Xem cả 1.489 đoạn trong 91_2015_QH13 (môn Dân sự)'), { count: 1489, name: '91_2015_QH13', mon: 'Dân sự' }));

test('parseOpenAtPage keeps parentheses that belong to the name', () =>
  deepEqual(parseOpenAtPage('Mở Hop_dong (A) (môn Kimh doanh) tại trang 24'), { name: 'Hop_dong (A)', mon: 'Kimh doanh', page: 24 }));

test('parseResume reads the Continue Reading card label', () =>
  deepEqual(parseResume('Đọc tiếp 0. GIỚI THIỆU MÔN HỌC, trang 3 / 8'), { name: '0. GIỚI THIỆU MÔN HỌC', page: 3, total: 8 }));

test('parsePageFooter', () => deepEqual(parsePageFooter('Trang 24 / 38'), { page: 24, total: 38 }));

test('non-matching labels → null', () => {
  equal(parseXemCa('Mở X (môn M) tại trang 2'), null);
  equal(parseOpenAtPage('Xem cả 3 đoạn trong X (môn M)'), null);
  equal(parseOpenAtPage('Mở X tại trang 2'), null);   // 1.41.0 label, no subject
  equal(parseResume('Trang 3 / 8 · chạm để đọc tiếp'), null);
  equal(parsePageFooter('Tới trang…'), null);
});

const LABELS = ['Tạo môn mới', 'Mở A (môn M) tại trang 3', 'Xem cả 12 đoạn trong A (môn M)',
  'Mở B (môn N) tại trang 1', 'Xem cả 1.004 đoạn trong B (môn N)'];

test('uniqueCardFrom pairs the first card', () => deepEqual(uniqueCardFrom(LABELS), { name: 'A', mon: 'M', page: 3, count: 12 }));

test('uniqueCardFrom index 1 → second card', () => deepEqual(uniqueCardFrom(LABELS, 1), { name: 'B', mon: 'N', page: 1, count: 1004 }));

test('same name in two subjects pairs each card with its own Xem cả', () =>
  deepEqual(uniqueCardFrom(['Mở X (môn M) tại trang 2', 'Xem cả 5 đoạn trong X (môn M)',
    'Mở X (môn N) tại trang 9', 'Xem cả 7 đoạn trong X (môn N)'], 1), { name: 'X', mon: 'N', page: 9, count: 7 }));

test('no result at all → says the query has no result', () =>
  throws(() => uniqueCardFrom(['Tạo môn mới']), /câu tra mẫu không còn kết quả/));

test('results with only one-match cards → says no card has Xem cả, not "no result"', () =>
  throws(() => uniqueCardFrom(['Mở A (môn M) tại trang 3', 'Mở B (môn M) tại trang 5']), (e: Error) =>
    /0 thẻ có nút "Xem cả"/.test(e.message) && !/không còn kết quả/.test(e.message)));

test('fewer Xem cả cards than the index asks → names how many there are', () =>
  throws(() => uniqueCardFrom(LABELS, 2), /2 thẻ có nút "Xem cả".*thẻ thứ 3/));

test('every Xem cả card duplicated → says the labels repeat, not "no result"', () =>
  throws(() => uniqueCardFrom(['Mở B (môn M) tại trang 2', 'Xem cả 2 đoạn trong B (môn M)',
    'Mở B (môn M) tại trang 2', 'Xem cả 2 đoạn trong B (môn M)'], 0),
  (e: Error) => /trùng nhãn/.test(e.message) && !/không còn kết quả/.test(e.message)));
