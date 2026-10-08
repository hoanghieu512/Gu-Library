import { test, expect } from 'e2e';
import { parsePageFooter } from '../lib/parse.ts';
import { exact, footerAt, tapCentre, toTab } from './helpers.ts';

// The divider's "Tìm"/"Đổi" buttons are not in the accessibility tree (the divider is a
// role="separator", whose children are presentational), so the swap cannot be driven: the test
// only checks by vision that the divider shows them (see ledger, Task 2).
test('split: pick, exit keeps the top page', async ({ app, agent, screen }) => {
  await app.open();
  await toTab(screen, agent, 'Trang chủ');
  const resume = screen.getByText(/^Trang \d+ \/ \d+ · chạm để đọc tiếp$/).first();
  const top = parsePageFooter((await resume.textContent()) ?? '');
  if (!top) throw new Error('không đọc được "Trang k / T" trên thẻ Đang đọc dở');
  await tapCentre(screen, resume);
  expect(await footerAt(screen, top.page)).toEqual(top);
  await screen.getByRole('button', { name: exact('Chia đôi màn hình') }).tap();
  await expect(screen.getByText(exact('Chọn tài liệu để tra cứu'))).toBeVisible();
  await agent.act('Chọn một tài liệu bất kỳ trong danh sách để mở ở khung dưới');
  // The act's own "passed" is not proof: on a cold run Haiku has tapped a subject name, taken it for
  // a document and reported success (the picker rows are plain divs, no role to tell them apart).
  // A document in the lower pane replaces the picker, so its title must be gone.
  await expect(screen.getByText(exact('Chọn tài liệu để tra cứu'))).toBeHidden();
  await agent.assert('Màn hình có hai khung tài liệu, một trên một dưới; giữa hai khung là một thanh màu nâu, và trên chính thanh đó có hai chữ "Tìm" và "Đổi" nằm cạnh nhau', { vision: 'only' });
  await screen.getByRole('button', { name: exact('Thoát chia đôi') }).tap();
  expect(await footerAt(screen, top.page)).toEqual(top);
});
