import { describe, it, expect } from 'vitest';
import { createProgressSaver, RETRY_GAP_MS } from './progressSaver';

// A save whose outcome each test decides, one call at a time.
function fakeSave() {
  const calls: { page: number; total: number; done: (ok: boolean) => void; fail: (err: unknown) => void }[] = [];
  const save = (page: number, total: number) =>
    new Promise<boolean>((done, fail) => { calls.push({ page, total, done, fail }); });
  return { save, calls, pages: () => calls.map((c) => c.page) };
}
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('createProgressSaver', () => {
  // PdfView reports the page on every scroll frame, mostly the same one.
  it('saves a page once, however often it is reported', async () => {
    const { save, calls, pages } = fakeSave();
    const onPage = createProgressSaver(save);
    onPage(5, 10); onPage(5, 10); onPage(5, 10);
    expect(pages()).toEqual([5]);
    calls[0].done(true); await settle();
    onPage(5, 10);
    expect(pages()).toEqual([5]);
  });

  it('runs one save at a time, then saves only the latest page reported meanwhile', async () => {
    const { save, calls, pages } = fakeSave();
    const onPage = createProgressSaver(save);
    onPage(5, 10); onPage(6, 10); onPage(7, 10); onPage(8, 10);
    expect(pages()).toEqual([5]);
    calls[0].done(true); await settle();
    expect(pages()).toEqual([5, 8]);
    expect(calls[1].total).toBe(10);
  });

  // Review of 20/10: the page counted as saved before the save ran, so a failed one never got
  // another try; closing the document on that page resumed at an older one.
  it('tries a page whose save failed again on a later report', async () => {
    let t = 0;
    const { save, calls, pages } = fakeSave();
    const onPage = createProgressSaver(save, () => t);
    onPage(30, 38);
    calls[0].done(false); await settle();
    t += RETRY_GAP_MS;
    onPage(30, 38);
    expect(pages()).toEqual([30, 30]);
  });

  // While Android hides the kho every save fails, and a retry on every scroll frame would list the
  // kho root over and over.
  it('waits RETRY_GAP_MS before trying a failed page again', async () => {
    let t = 0;
    const { save, calls, pages } = fakeSave();
    const onPage = createProgressSaver(save, () => t);
    onPage(30, 38);
    calls[0].done(false); await settle();
    t += RETRY_GAP_MS - 1;
    onPage(30, 38); onPage(30, 38);
    expect(pages()).toEqual([30]);
  });

  it('saves a new page right away after a failure', async () => {
    const { save, calls, pages } = fakeSave();
    const onPage = createProgressSaver(save, () => 0);
    onPage(30, 38);
    calls[0].done(false); await settle();
    onPage(31, 38);
    expect(pages()).toEqual([30, 31]);
  });

  it('counts a save that throws as failed and keeps going', async () => {
    let t = 0;
    const { save, calls, pages } = fakeSave();
    const onPage = createProgressSaver(save, () => t);
    onPage(30, 38); onPage(31, 38);
    calls[0].fail(new Error('boom')); await settle();
    expect(pages()).toEqual([30, 31]);
    calls[1].done(true); await settle();
    t += RETRY_GAP_MS;
    onPage(30, 38);
    expect(pages()).toEqual([30, 31, 30]);
  });
});
