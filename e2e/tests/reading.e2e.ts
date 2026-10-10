import { test, expect } from 'e2e';
import { footer, footerAt, gotoPage, openByPath, resumeButton, toTab } from './helpers.ts';
import type { DocPath } from './helpers.ts';

// Two known QA-kho documents, reached by labels (no model): a portrait one, and a slide deck whose
// pages are shorter than half the viewport, where 1.41.0 drifted one page per leave/resume
// (3 → 4 → 5 → 6 on UBS1). Kho changed → update these constants.
// The portrait test used an agent ("open any document") until 1.41.1: on cold runs Haiku 5.5 kept
// opening a one-page scan, which never reaches "Đang đọc dở" (the Viewer records only page changes).
const PORTRAIT: DocPath = { mon: /^Mở môn Hình sự chung \(/, folder: /^Ôn tập thi \d+ tài liệu$/, doc: 'ĐỀ CƯƠNG CHI TIẾT MÔN HSPC' };
const SLIDE: DocPath = { mon: /^Mở môn Hình sự chung \(/, folder: /^Slide \d+ tài liệu$/, doc: '0. GIỚI THIỆU MÔN HỌC' };
const HERE = 'tests/reading.e2e.ts';

test('jump to page, leave, resume from Đang đọc dở on the same page', async ({ app, agent, screen }) => {
  await app.open();
  await toTab(screen, agent, 'Trang chủ');
  await openByPath(screen, PORTRAIT, HERE);
  const { page: a, total } = await footer(screen);
  // Move to a page other than the one it opened on, so the resume has something to prove.
  const k = a === Math.min(3, total) ? (a > 1 ? 1 : 2) : Math.min(3, total);
  await gotoPage(screen, k);
  await toTab(screen, agent, 'Trang chủ');
  const resume = resumeButton(screen, PORTRAIT.doc);
  await expect(resume).toBeVisible();
  await resume.tap();
  expect(await footerAt(screen, k)).toEqual({ page: k, total });
});

test('a slide deck resumes on the same page, three times', async ({ app, agent, screen }) => {
  await app.open();
  await toTab(screen, agent, 'Trang chủ');
  await openByPath(screen, SLIDE, HERE);
  const { total } = await footer(screen);
  await gotoPage(screen, 3);
  for (let i = 0; i < 3; i++) {
    await toTab(screen, agent, 'Trang chủ');
    const resume = resumeButton(screen, SLIDE.doc);
    await expect(resume).toBeVisible();
    await resume.tap();
    expect(await footerAt(screen, 3)).toEqual({ page: 3, total });
  }
});

// Typing the page in "Tới trang" leaves the keyboard up when "Nhảy" is tapped: the jump lands in a
// shorter viewport, then the keyboard closes and the browser clamps the scroll. The last page must
// still read as the last page (the first 1.41.1 build showed 7 / 8 here). Reaching the last page
// means "done": the app drops the document from "Đang đọc dở" by design, so the resume half uses the
// page before it — also clamped at the bottom of a slide deck.
test('jump near the end with the keyboard up, then resume', async ({ app, agent, screen }) => {
  await app.open();
  await toTab(screen, agent, 'Trang chủ');
  await openByPath(screen, SLIDE, HERE);
  const { total } = await footer(screen);
  await gotoPage(screen, total);        // fills "Tới trang" (keyboard up), taps "Nhảy", holds ~2.5 s
  await gotoPage(screen, total - 1);
  await toTab(screen, agent, 'Trang chủ');
  const resume = resumeButton(screen, SLIDE.doc);
  await expect(resume).toBeVisible();
  await resume.tap();
  expect(await footerAt(screen, total - 1)).toEqual({ page: total - 1, total });
});
