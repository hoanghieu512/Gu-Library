import { test, expect } from 'e2e';
import { exact, footer, footerAt, gotoPage, openByPath, toTab } from './helpers.ts';
import type { DocPath } from './helpers.ts';

// Mục lục Điều (1.43.0), by labels only (no model). A known QA-kho law and one of its Điều with
// its start page: kho changed (or the worker rewrote the sidecar) → update these constants.
const LAW: DocPath = { mon: /^Mở môn Luật Công Chứng \(/, folder: /^mới \d+ tài liệu$/, doc: 'Luat doanh nghiep 2020 (vbhn 2025)' };
const DIEU = { num: '45', page: 23 };
const HERE = 'tests/toc.e2e.ts';

const dieuRow = () => exact(`Nhảy tới Điều ${DIEU.num}, trang ${DIEU.page}`);

test('Mục lục Điều: filter by number, tap the Điều, the Viewer lands on its page', async ({ app, agent, screen }) => {
  await app.open();
  await toTab(screen, agent, 'Trang chủ');
  await openByPath(screen, LAW, HERE);
  const { page, total } = await footer(screen);
  // Start away from the target page, or a jump that does nothing would still pass.
  if (page === DIEU.page) await gotoPage(screen, 1);

  // The button shows only after the first page has painted and the sidecar has been read.
  const toc = screen.getByRole('button', { name: exact('Mục lục Điều') });
  await expect(toc).toBeVisible();
  await toc.tap();
  await expect(screen.getByText(/^[\d.]+ Điều$/)).toBeVisible();
  // The filter's aria-label does not reach Android's tree (the textbox has no name); with the sheet
  // open Ionic hides the Viewer behind it, "Tới trang…" included, so it is the only textbox.
  await screen.getByRole('textbox').fill(DIEU.num);
  await expect(screen.getByText(exact('1 Điều khớp'))).toBeVisible();
  const row = screen.getByRole('button', { name: dieuRow() });
  await row.waitFor({ timeout: 5000 }).catch(() => {
    throw new Error(`Mục lục không có "Điều ${DIEU.num}, trang ${DIEU.page}": sửa hằng trong ${HERE}`);
  });
  await row.tap();
  expect(await footerAt(screen, DIEU.page)).toEqual({ page: DIEU.page, total });
});

// The split view has no footer for the bottom pane, so its page is read from the table itself: a
// fresh bottom pane starts at page 1, and the sheet opens scrolled to the Điều being read (rows
// off screen are not in Android's tree). After the jump, reopening shows Điều 45 and not Điều 1.
const PORTRAIT: DocPath = { mon: /^Mở môn Hình sự chung \(/, folder: /^Ôn tập thi \d+ tài liệu$/, doc: 'ĐỀ CƯƠNG CHI TIẾT MÔN HSPC' };

test('split: "Mục lục" on the divider jumps the bottom pane, the top page stays', async ({ app, agent, screen }) => {
  await app.open();
  await toTab(screen, agent, 'Trang chủ');
  await openByPath(screen, PORTRAIT, HERE);
  const top = await footer(screen);

  await screen.getByRole('button', { name: exact('Chia đôi màn hình') }).tap();
  await expect(screen.getByText(exact('Chọn tài liệu để tra cứu'))).toBeVisible();
  await screen.getByRole('button', { name: exact('Mở môn Luật Công Chứng') }).tap();
  await screen.getByRole('button', { name: /^Mở thư mục mới$/ }).tap();
  await screen.getByRole('button', { name: exact(`Mở ${LAW.doc} ở khung dưới`) }).tap();

  // Shown only once the bottom pane has painted its first page and its sidecar has Điều.
  const divider = screen.getByRole('button', { name: exact('Mục lục Điều của tài liệu tra cứu') });
  await expect(divider).toBeVisible();
  await divider.tap();
  const first = screen.getByRole('button', { name: exact('Nhảy tới Điều 1, trang 1') });
  await expect(first).toBeVisible();
  await screen.getByRole('textbox').fill(DIEU.num);
  await screen.getByRole('button', { name: dieuRow() }).tap();
  await expect(screen.getByText(exact('Mục lục Điều'))).toBeHidden();

  await divider.tap();
  await expect(screen.getByRole('button', { name: dieuRow() })).toBeVisible();
  await expect(first).toBeHidden();
  await screen.getByRole('button', { name: exact('Đóng') }).tap();

  await screen.getByRole('button', { name: exact('Thoát chia đôi') }).tap();
  expect(await footerAt(screen, top.page)).toEqual(top);
});
