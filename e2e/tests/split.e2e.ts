import { test, expect } from 'e2e';
import { parseResume } from '../lib/parse.ts';
import { exact, footerAt, pickInPicker, resumeButton, toTab } from './helpers.ts';

// Labels only since 1.41.1 (picker rows are buttons, the divider's buttons are no longer hidden
// inside a role="separator"): no agent step, no vision check, no model call.
test('split: pick, search and swap on the divider, exit keeps the top page', async ({ app, agent, screen }) => {
  await app.open();
  await toTab(screen, agent, 'Trang chủ');
  const resume = resumeButton(screen);
  await expect(resume).toBeVisible();
  const r = parseResume((await resume.textContent()) ?? '');
  if (!r) throw new Error('không đọc được nhãn "Đọc tiếp …, trang k / T" của thẻ Đang đọc dở');
  const top = { page: r.page, total: r.total };
  await resume.tap();
  expect(await footerAt(screen, top.page)).toEqual(top);

  await screen.getByRole('button', { name: exact('Chia đôi màn hình') }).tap();
  await expect(screen.getByText(exact('Chọn tài liệu để tra cứu'))).toBeVisible();
  await pickInPicker(screen);
  // A document in the lower pane unmounts the picker: neither its title nor "Lên trên" is left.
  await expect(screen.getByText(exact('Chọn tài liệu để tra cứu'))).toBeHidden();
  await expect(screen.getByRole('button', { name: exact('Lên trên') })).toBeHidden();
  await expect(screen.getByRole('button', { name: exact('Tìm trong tài liệu tra cứu') })).toBeVisible();
  const swap = screen.getByRole('button', { name: exact('Đổi tài liệu tra cứu') });
  await expect(swap).toBeVisible();

  await swap.tap();
  await expect(screen.getByText(exact('Chọn tài liệu để tra cứu'))).toBeVisible();
  await pickInPicker(screen);
  await expect(swap).toBeVisible();

  await screen.getByRole('button', { name: exact('Thoát chia đôi') }).tap();
  expect(await footerAt(screen, top.page)).toEqual(top);
});
