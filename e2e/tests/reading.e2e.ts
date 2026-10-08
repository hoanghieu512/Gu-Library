import { test, expect } from 'e2e';
import { footer, footerAt, gotoPage, tapCentre, toTab } from './helpers.ts';

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
  const resume = screen.getByText(new RegExp(`^Trang ${k} / ${T} · chạm để đọc tiếp$`)).first();
  await expect(resume).toBeVisible();
  await tapCentre(screen, resume);
  expect(await footerAt(screen, k)).toEqual({ page: k, total: T });
});
