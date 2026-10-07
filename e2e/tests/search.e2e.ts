import { test, expect } from 'e2e';
import { exact, footer, gotoPage, openAtLabel, readUniqueCard, revealAboveTabBar, search, tapCentre, toTab, vi, waitIndexReady, xemCaLabel } from './helpers.ts';

// Any query with results across several documents; no letter "u" (Gboard on UBS1 drops it).
const QUERY = 'hop dong';

test('Xem cả opens the in-doc sheet with the card count and first row', async ({ app, agent, screen }) => {
  await app.open();
  await toTab(screen, agent, 'Tìm');
  await waitIndexReady(screen);
  await search(screen, QUERY);
  const card = await readUniqueCard(screen);
  await screen.getByRole('button', { name: exact(xemCaLabel(card)) }).tap();
  await expect(screen.getByText(exact(`${vi(card.count)} đoạn khớp`))).toBeVisible();
  await expect(screen.getByRole('button', { name: exact(`Nhảy tới trang ${card.page}`) }).first()).toBeVisible();
});

test('Xem cả into a document already open in another tab still opens the sheet', async ({ app, agent, screen }) => {
  await app.open();
  await toTab(screen, agent, 'Tìm');
  await search(screen, QUERY);
  const card = await readUniqueCard(screen);
  // Open the document and move one page so it becomes the top "Đang đọc dở" (opening it on its
  // saved page records nothing); back closes that Viewer so the next one lives in the Home tab —
  // the case Ionic used to reuse without the sheet.
  await screen.getByRole('button', { name: exact(openAtLabel(card)) }).tap();
  const f = await footer(screen);
  await gotoPage(screen, f.page < f.total ? f.page + 1 : f.page - 1);
  await screen.getByRole('button', { name: exact('back') }).tap();
  await toTab(screen, agent, 'Trang chủ');
  await expect(screen.getByText(exact(card.name)).first()).toBeVisible();
  await tapCentre(screen, screen.getByText(exact(card.name)).first());
  await footer(screen);
  await toTab(screen, agent, 'Tìm');
  await screen.getByRole('button', { name: exact(xemCaLabel(card)) }).tap();
  await expect(screen.getByText(exact(`${vi(card.count)} đoạn khớp`))).toBeVisible();
});

test('tapping a sheet row before the PDF is ready lands on that page', async ({ app, agent, screen }) => {
  await app.open();
  await toTab(screen, agent, 'Tìm');
  await search(screen, QUERY);
  const card = await readUniqueCard(screen);
  await screen.getByRole('button', { name: exact(xemCaLabel(card)) }).tap();
  // No wait for the PDF: tap the first row as soon as the sheet lists it.
  await screen.getByRole('button', { name: exact(`Nhảy tới trang ${card.page}`) }).first().tap();
  expect((await footer(screen)).page).toBe(card.page);
});

test('a lower card Xem cả is reachable with the keyboard dismissed', async ({ app, agent, screen }) => {
  await app.open();
  await toTab(screen, agent, 'Tìm');
  await search(screen, QUERY);
  const card = await readUniqueCard(screen, 1);
  const xemCa = screen.getByRole('button', { name: exact(xemCaLabel(card)) });
  await revealAboveTabBar(screen, xemCa);
  await xemCa.tap();
  await expect(screen.getByText(exact(`${vi(card.count)} đoạn khớp`))).toBeVisible();
});
