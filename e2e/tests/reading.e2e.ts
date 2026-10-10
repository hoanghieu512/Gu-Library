import { test, expect } from 'e2e';
import { exact, footer, footerAt, gotoPage, resumeButton, toTab } from './helpers.ts';

// Resume is checked by page AND total: the Viewer title has no role to read the name by, and the
// agent opens any document (see ledger, Task 2).
test('jump to page, leave, resume from Đang đọc dở on the same page', async ({ app, agent, screen }) => {
  await app.open();
  await toTab(screen, agent, 'Trang chủ');
  await agent.act('Mở môn đầu tiên trên kệ, rồi mở một tài liệu PDF bất kỳ trong đó (vào thư mục con nếu cần)');
  const { page: a, total: T } = await footer(screen);
  // Move to a page other than the one it opened on, so the resume has something to prove
  // (a one-page document can only check the resume itself).
  let k = Math.min(3, T);
  if (k === a) k = a > 1 ? 1 : Math.min(2, T);
  if (k !== a) await gotoPage(screen, k);
  await toTab(screen, agent, 'Trang chủ');
  const resume = screen.getByRole('button', { name: new RegExp(`^Đọc tiếp .+, trang ${k} \\/ ${T}$`) }).first();
  await expect(resume).toBeVisible();
  await resume.tap();
  expect(await footerAt(screen, k)).toEqual({ page: k, total: T });
});

// A slide deck in the QA kho: pages shorter than half the viewport, where 1.41.0 drifted one page
// per leave/resume (3 → 4 → 5 → 6 on UBS1). Labels only, no model. Kho changed → update SLIDE.
const SLIDE = { mon: /^Mở môn Hình sự chung \(/, folder: /^Slide \d+ tài liệu$/, doc: '0. GIỚI THIỆU MÔN HỌC' };

test('a slide deck resumes on the same page, three times', async ({ app, agent, screen }) => {
  await app.open();
  await toTab(screen, agent, 'Trang chủ');
  const mon = screen.getByRole('button', { name: SLIDE.mon });
  await mon.waitFor({ timeout: 15000 }).catch(() => {
    throw new Error('kho QA thiếu slide mẫu — sửa hằng SLIDE trong tests/reading.e2e.ts');
  });
  await mon.tap();
  await screen.getByRole('button', { name: SLIDE.folder }).tap();
  await screen.getByRole('button', { name: exact(SLIDE.doc) }).tap();
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
