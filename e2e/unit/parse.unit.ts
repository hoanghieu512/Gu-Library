import { test } from 'node:test';
import { deepEqual, equal, throws } from 'node:assert/strict';
import { parseXemCa, parseOpenAtPage, parsePageFooter, readCardFrom } from '../lib/parse.ts';

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

test('readCardFrom pairs the first card', () => deepEqual(readCardFrom(LABELS), { name: 'A', page: 3, count: 12 }));

test('readCardFrom index 1 → second card', () => deepEqual(readCardFrom(LABELS, 1), { name: 'B', page: 1, count: 1004 }));

test('readCardFrom with no card → explicit error', () =>
  throws(() => readCardFrom(['Tạo môn mới']), /câu tra mẫu không còn kết quả/));
