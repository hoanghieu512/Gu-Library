// Shared steps for the smoke tests. Rule: the agent only does fuzzy navigation; typing, tapping and
// every check go through exact locators (no model call, no judgement).
import { expect } from 'e2e';
import type { Agent, Locator, Screen } from 'e2e';
import { parsePageFooter, uniqueCardFrom } from '../lib/parse.ts';
import type { Card } from '../lib/parse.ts';

const CARD_LABEL = /^(Mở .+ tại trang \d+|Xem cả .+ đoạn trong .+)$/;

/** Exact, anchored match for a label (locator name matching is otherwise loose). */
export const exact = (s: string): RegExp => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

/** Numbers as the app renders them ("1.489"). */
export const vi = (n: number): string => n.toLocaleString('vi-VN');

export const xemCaLabel = (c: Card): string => `Xem cả ${vi(c.count)} đoạn trong ${c.name}`;
export const openAtLabel = (c: Card): string => `Mở ${c.name} tại trang ${c.page}`;

/**
 * Tap a plain text node (a title, a name on a card) at the centre of its bounds. A locator tap
 * on a node that is not a control goes through agent-device's ref press, which landed on another
 * element (seen: the Search title opened the first result card). Buttons and tabs tap normally.
 */
export async function tapCentre(screen: Screen, node: Locator): Promise<void> {
  const box = await node.boundingBox();
  if (!box) throw new Error('nút chữ cần chạm không có trên màn hình');
  await screen.tapAt({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
}

/**
 * Drag the list until `node` sits above the tab bar. The bottom card's "Xem cả" line can lie
 * under the tab bar: still in the tree (and "visible" to scrollUntilVisible), but a tap there hits
 * the bar. A slow drag (no fling) moves the list a known amount and never counts as a tap.
 */
export async function revealAboveTabBar(screen: Screen, node: Locator): Promise<void> {
  const bar = await screen.getByRole('tablist').boundingBox();
  if (!bar) return;
  for (let i = 0; i < 4; i++) {
    const box = await node.boundingBox();
    if (!box) throw new Error('nút cần chạm không có trên màn hình');
    if (box.y + box.height <= bar.y) return;
    const x = bar.x + bar.width / 2;
    await screen.swipe({ from: { x, y: bar.y - 150 }, to: { x, y: bar.y - 550 }, duration: 500 });
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('không kéo được nút lên khỏi thanh tab');
}

/** Get to a tab from wherever a previous test left the app (open sheet, split view, Viewer). */
export async function toTab(screen: Screen, agent: Agent, name: 'Trang chủ' | 'Tìm'): Promise<void> {
  const close = screen.getByRole('button', { name: exact('Đóng') });
  if (await close.isVisible()) await close.tap();
  const exitSplit = screen.getByRole('button', { name: exact('Thoát chia đôi') });
  if (await exitSplit.isVisible()) await exitSplit.tap();
  // Tapping the current tab does not pop a pushed Viewer; back out to the tab's root first.
  // (Otherwise the hidden page underneath still answers locators — seen: the Viewer's "Tới trang"
  // box filled as if it were the Search box.)
  const back = screen.getByRole('button', { name: exact('back') });
  for (let i = 0; i < 4 && (await back.isVisible()); i++) {
    await back.tap();
    await new Promise((r) => setTimeout(r, 600));
  }
  const tab = screen.getByRole('tab', { name: exact(name) });
  if (!(await tab.isVisible())) {
    await agent.act('Quay về màn có thanh tab dưới cùng (đóng bảng đang mở, thoát chia đôi, quay lại)');
  }
  await tab.tap();
}

/** First Search visit after a SCHEMA bump rebuilds the index (~20 s on UBS1). */
export async function waitIndexReady(screen: Screen): Promise<void> {
  await screen.getByText(/Đang đọc kho lần đầu/).waitFor({ state: 'hidden', timeout: 60000 });
}

/**
 * Fill the Search box, wait for the "N đoạn · M tài liệu" line, then put the keyboard away by
 * tapping the page title (fixed at the top, no handler). Gboard covers the lower half: cards
 * under it drop out of the screen and a tap there lands on the keyboard. `press('Enter')` leaves
 * it up.
 */
export async function search(screen: Screen, query: string): Promise<void> {
  await screen.getByRole('textbox').fill(query);
  await expect(screen.getByText(/ đoạn · .* tài liệu$/)).toBeVisible();
  await tapCentre(screen, screen.getByText(exact('Tìm')).first());
  // Let the keyboard finish sliding away before anything below it is read or tapped.
  await new Promise((r) => setTimeout(r, 800));
}

/** First card at or after `fromIndex` that can be tapped unambiguously (see uniqueCardFrom). */
export async function readUniqueCard(screen: Screen, fromIndex = 0): Promise<Card> {
  return uniqueCardFrom(await screen.getByRole('button', { name: CARD_LABEL }).allTextContents(), fromIndex);
}

/** Viewer footer "Trang a / T" — rendered as separate text nodes, so join them; wait for a total. */
export async function footer(screen: Screen): Promise<{ page: number; total: number }> {
  let parts: string[] = [];
  for (let i = 0; i < 30; i++) {
    parts = await screen.getByText(/^(Trang|\d+|\/)$/).allTextContents();
    const f = parsePageFooter(parts.join(' '));
    if (f) return f;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`không đọc được chân trang Viewer: "${parts.join(' ')}"`);
}

/**
 * Poll the footer until it shows `page`, and return the last reading. A Viewer first shows the
 * saved (or first) page and applies a pending jump a moment later — a single read caught the
 * saved page 25 while the jump to 24 was landing. A jump that never lands still fails: the caller
 * compares the reading after the timeout.
 */
export async function footerAt(screen: Screen, page: number, timeoutMs = 15000): Promise<{ page: number; total: number }> {
  const end = Date.now() + timeoutMs;
  let f = await footer(screen);
  while (f.page !== page && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 500));
    f = await footer(screen);
  }
  return f;
}

/** Jump the Viewer with "Tới trang…" + "Nhảy" and wait until the footer shows that page. */
export async function gotoPage(screen: Screen, page: number): Promise<void> {
  await screen.getByRole('textbox').fill(String(page));
  await screen.getByRole('button', { name: exact('Nhảy') }).tap();
  if ((await footerAt(screen, page)).page !== page) throw new Error(`Viewer không tới được trang ${page}`);
}
