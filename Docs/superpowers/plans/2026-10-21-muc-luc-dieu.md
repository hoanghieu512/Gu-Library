# Mục lục Điều (bậc 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Mục lục Điều" sheet in the Viewer: the Chương/Điều of the open document, read from its sidecar, filterable by article number, tap to jump.

**Architecture:** Pure TOC logic (`src/viewer/dieuToc.ts`) fed by a loader that reads one sidecar through the cached kho snapshot (`src/viewer/loadToc.ts`), a hook that loads after the pane's first paint (`src/viewer/useDieuToc.ts`), a sheet (`src/components/DieuTocSheet.tsx`), and the wiring in `ViewerPage`. No change to the PDF read path or the search index.

**Tech Stack:** Ionic React 8, React 19, TypeScript, vitest + Testing Library (jsdom).

**Spec:** `Docs/superpowers/specs/2026-10-21-muc-luc-dieu-design.md`

## Global Constraints

- No em dash (U+2014) anywhere: code, comments, UI text, docs. Test fixtures that need the image-page marker build it from `IMAGE_PAGE_PREFIX`.
- Code, comments, commit messages in English; UI text in Vietnamese.
- App code imports `Saf` from `src/plugins/saf.ts`, never `SafNative`.
- Tests fake the plugin with `vi.mock('../plugins/safNative', () => ({ SafNative: {} }))` + `Object.assign(SafNative, fakeKho().saf)`, Preferences with `vi.mock('@capacitor/preferences', () => import('../test/fakePreferences'))`; any spy or stub on a global is restored in `afterEach`.
- Do not touch `src/storage/safFile.ts`, the sidecar schema, the worker, `package.json` version, `src/whatsNew/notes.ts`, `CHANGELOG.md`, the ops doc.
- `npm run lint`: 0 errors and still exactly 10 warnings (no new `react-hooks/set-state-in-effect`).
- Exact copy: sheet title `Mục lục Điều`; footer button `aria-label="Mục lục Điều"`, icon `listOutline`; divider button text `Mục lục`, `aria-label="Mục lục Điều của tài liệu tra cứu"`; filter placeholder `Lọc theo số Điều…`, `aria-label="Lọc theo số Điều"`; clear icon `aria-label="Xoá ô lọc"`; status `N Điều` / `N Điều khớp` / `Không có Điều nào số “q”`; row `aria-label="Nhảy tới <label>, trang <page>"`, right text `tr. <page>`; filtered second line `<chapter> · trang <page>` or `trang <page>`; mark `đang đọc`. Numbers formatted with `toLocaleString('vi-VN')`.
- Values: title cut at 160 chars; sheet breakpoint 0.75; auto-scroll 350 ms after open with `{ block: 'center' }`.

## Review Focus

- A malformed sidecar (`units` missing or not an array, `label` not a string, `path` not an array) must give an empty or partial TOC, never throw: test in Task 1.
- A filter of only spaces, punctuation or the word "Điều" is no filter at all, not "Không có Điều nào số “”": test in Task 1.
- Units whose `page` is 0, negative, NaN or a string are left out rather than jumping to a wrong page: test in Task 1.
- Swapping the bottom document must drop its "Mục lục" button at once, and a late TOC of the old document must never show: tests in Task 4 and Task 6.
- Reopening the sheet after a jump marks the Điều of the new page (the mark follows `currentPage`, the filter is not kept): test in Task 5.

---

### Task 1: TOC logic

**Files:**
- Create: `src/viewer/dieuToc.ts`
- Test: `src/viewer/dieuToc.test.ts`

**Interfaces:**
- Consumes: `fold` from `src/search/tokenize.ts`; `Sidecar`, `SidecarUnit`, `isReadableText`, `IMAGE_PAGE_PREFIX` from `src/search/invertedIndex.ts`.
- Produces:
  ```ts
  export interface TocEntry { i: number; num: string; label: string; title: string; chapter: string; page: number }
  export function buildToc(sidecar: Sidecar): TocEntry[];
  export function dieuQuery(raw: string): string;                                   // normalized number, '' = no filter
  export function filterToc(entries: TocEntry[], raw: string): TocEntry[] | null;   // null = no filter
  export function readingEntries(entries: TocEntry[], page: number): Set<number>;   // set of `i`
  ```

- [ ] **Step 1: Write the failing tests**

Fixture helper: `const d = (o: Partial<SidecarUnit>): SidecarUnit => ({ type: 'dieu', page: 1, text: '', ...o })`.

`describe('buildToc')`:
- `keeps only dieu units, in document order`: units `[d({label:'Điều 1'}), {type:'khoan',label:'Khoản 1',page:1,text:'x'}, {type:'heading',label:'',page:2,text:'x'}, d({label:'Điều 2',page:3})]` → `toc.map(e => [e.i, e.label])` equals `[[0,'Điều 1'],[1,'Điều 2']]`.
- `reads number, title and nearest chapter`: `d({label:'Điều 5', path:['Phần thứ nhất','Chương I','Mục 1','Điều 5'], page:3, text:'Điều 5. Nguyên tắc áp dụng\n1. Khoản một.'})` → `toEqual({i:0,num:'5',label:'Điều 5',title:'Nguyên tắc áp dụng',chapter:'Chương I',page:3})`.
- `takes the last Chương of an odd path`: path `['Chương I','Chương II','Điều 9']` → chapter `'Chương II'`; path `[]` → `''`.
- `reads Ð and letter suffixes`: label `'Ðiều 10a'` (U+00D0), text `'Ðiều 10a. Bổ sung'` → label `'Điều 10a'`, num `'10a'`, title `'Bổ sung'`.
- `lists a label without a number`: label `'Điều bổ sung'` → num `''`, still listed.
- `falls back to the text for an empty label`: label `''`, text `'Điều 12: Hiệu lực thi hành'` → label `'Điều 12'`, num `'12'`, title `'Hiệu lực thi hành'`; label `''`, text `'Không có số'` → not listed.
- `title of heading-only, long and image units`: text `'Điều 34.'` → `''`; text `'Điều 1. ' + 'a'.repeat(300)` → title length `160`; text `IMAGE_PAGE_PREFIX + ' (trang 4)'` → `''`.
- `leaves out units without a usable page`: pages `0`, `-1`, `NaN`, `'5' as unknown as number`, `undefined` → `[]`.
- `keeps duplicate numbers`: `Điều 3` p1 and `Điều 3` p128 → two entries, i `0` and `1`.
- `survives a malformed sidecar`: `buildToc({})` and `buildToc({ units: 'x' } as unknown as Sidecar)` → `[]`; unit `{type:'dieu', label: 5, path: 'Chương I', page: 2, text: 'Điều 7. X'}` (cast) → one entry, label `'Điều 7'`, chapter `''`.

`describe('filterToc')`, fixture `buildToc` of labels/pages: Điều 3 p1, Điều 5 p2, Điều 10 p3, Điều 10a p4, Điều 30 p9, Điều 35 p10, Điều 100 p30, Điều 3 p128.
- `no filter for an empty query`: `''`, `'   '`, `'Điều'`, `'dieu .'` → `null`; `dieuQuery('Điều')` → `''`.
- `exact number first, then numbers starting with it`: `'3'` → `[label,page]` `[['Điều 3',1],['Điều 3',128],['Điều 30',9],['Điều 35',10]]`; `'10'` → labels `['Điều 10','Điều 10a','Điều 100']`; `'10A'` → `['Điều 10a']`.
- `reads Điều 5, dieu 5, Ðiều 5 and " 5." as 5`: each → labels `['Điều 5']`; `dieuQuery(' 5.')` → `'5'`.
- `nothing for a number the document lacks`: `'999'` → `[]`; `dieuQuery('dieu 999')` → `'999'`.

`describe('readingEntries')`, fixture pages: Điều 1 p1, Điều 2 p1, Điều 3 p2, Điều 4 p4, Điều 5 p4, Điều 6 p7 (i 0..5).
- `the Điều that start on the page`: page 4 → `new Set([3,4])`; page 1 → `new Set([0,1])`.
- `the Điều running through a page where none starts`: page 3 → `{2}`; page 5 → `{4}`; page 9 → `{5}`.
- `nothing before the first Điều`: entries starting at p3 only, page 1 → empty set.
- `a repeated number later in the document`: Điều 3 p1, Điều 4 p2, Điều 3 p128 → page 130 → `{2}`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/viewer/dieuToc.test.ts`
Expected: FAIL, module `./dieuToc` not found.

- [ ] **Step 3: Implement `src/viewer/dieuToc.ts`**

Normalize every string with NFC, then U+00D0 to `Đ` and U+00F0 to `đ`, before folding or display. Number: `fold(label)` matched against `/^dieu\s*(\d+[a-z]*)/`. Title: first line of the readable text, strip a leading `Điều <digits><letters>` plus an optional `.` or `:`, trim, slice to 160. `dieuQuery`: fold, drop a leading `dieu`, keep only `[a-z0-9]`. `filterToc`: two passes over `entries` (exact, then `startsWith` and not exact). `readingEntries`: entries with `page === P`; else the single entry with the largest `page < P`, ties to the later `i`. Ignore non-string `label`/`text` and non-array `path`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/viewer/dieuToc.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/viewer/dieuToc.ts src/viewer/dieuToc.test.ts
git commit -m "feat(viewer): build, filter and mark a Điều table of contents from a sidecar"
```

### Task 2: Shared sidecar lookup in the kho snapshot

**Files:**
- Modify: `src/storage/khoSnapshot.ts` (add export after `folderByPath`)
- Modify: `src/search/docIndex.ts` (drop private `findDoc` and its loop, call the new function)
- Test: `src/storage/khoSnapshot.test.ts`

**Interfaces:**
- Produces: `export function findDocInKho(snap: KhoSnapshot, pdfUri: string): { jsonUri: string; name: string; mon: string } | null` (name = `fileBase ?? name`, mon = the subject's name; walks `snap.mons` in order through `snap.monFolders`, recursing into `children`).

- [ ] **Step 1: Write the failing test** `describe('findDocInKho')` using the file's `doc`/`folder` helpers and a snapshot shaped like the `folderByPath` one (mon `Logic` with sub-folder `Slide` holding `doc('x')`):
  - `finds a document in a sub-folder`: `findDocInKho(snap, 'u:x.pdf')` → `toEqual({ jsonUri: 'u:x.json', name: 'x', mon: 'Logic' })`.
  - `null for a document the kho does not have`: `findDocInKho(snap, 'u:nope.pdf')` → `null`.
- [ ] **Step 2: Run** `npx vitest run src/storage/khoSnapshot.test.ts`. Expected: FAIL, `findDocInKho` is not exported.
- [ ] **Step 3: Implement** `findDocInKho` in `khoSnapshot.ts` (pure, no SAF); make `indexOneDoc` use it with unchanged behavior.
- [ ] **Step 4: Run** `npx vitest run src/storage src/search src/components/DocSearchSheet.test.tsx`. Expected: PASS.
- [ ] **Step 5: Commit** `refactor(storage): one lookup from a pdf to its sidecar in the kho snapshot`.

### Task 3: Loader

**Files:**
- Create: `src/viewer/loadToc.ts`
- Test: `src/viewer/loadToc.test.ts`

**Interfaces:**
- Consumes: `getKhoSnapshot`, `findDocInKho` (Task 2); `buildToc`, `TocEntry` (Task 1); `Saf` from `src/plugins/saf`.
- Produces: `export async function loadToc(pdfUri: string): Promise<TocEntry[] | null>`; never rejects.

- [ ] **Step 1: Write the failing tests.** Setup as the `getKhoSnapshot` block of `khoSnapshot.test.ts`: `prefs.clear()`, `prefs.set('saf_root_uri', ROOT)`, `kho = fakeKho()`, `Object.assign(SafNative, kho.saf)`, `invalidateKho()`. Seed `const pdf = kho.put('Luật/Luật DN.pdf', '%PDF')` and `kho.put('Luật/Luật DN.json', JSON.stringify(sidecar))` with a `kind: 'legal'` sidecar holding `Điều 1` p1 and `Điều 2` p3 (plus one `khoan`).
  - `reads the Điều of the document`: `(await loadToc(pdf))?.map(e => e.label)` → `['Điều 1', 'Điều 2']`.
  - `an empty list for a document without Điều`: slide sidecar (`type: 'slide'` units) → `[]`.
  - `null when the kho does not have the document`: `loadToc('content://nope.pdf')` → `null`.
  - `null for a broken sidecar`: json data `'{oops'` → `null`.
  - `null while Android hides the kho`: `kho.state.hideAll = true` → resolves `null` (no rejection).
- [ ] **Step 2: Run** `npx vitest run src/viewer/loadToc.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `loadToc`: whole body in one `try`, `catch` returns `null`; keep only the `buildToc` result.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(viewer): load a document's Điều table of contents from its sidecar`.

### Task 4: Hook that loads per document

**Files:**
- Create: `src/viewer/useDieuToc.ts`
- Test: `src/viewer/useDieuToc.test.ts`

**Interfaces:**
- Consumes: `loadToc` (Task 3).
- Produces: `export function useDieuToc(docUri: string | null): TocEntry[] | null`. `null` while not asked, loading, or unreadable.

- [ ] **Step 1: Write the failing tests** with `vi.mock('./loadToc', () => ({ loadToc: vi.fn() }))` and per-uri deferred promises, using `renderHook` from `@testing-library/react`:
  - `does not load without a document`: `useDieuToc(null)` → `loadToc` not called, result `null`.
  - `returns the table once loaded`: uri `'a'` resolves `[entryA]` → `await waitFor(() => expect(result.current).toEqual([entryA]))`.
  - `never returns the table of a previous document`: start on `'a'` (pending), rerender `'b'`, resolve `'a'` → `result.current` stays `null`; resolve `'b'` → `[entryB]`.
  - `drops the table at once when the document goes away`: loaded `'a'`, rerender `null` → `result.current` is `null` in the same render.
- [ ] **Step 2: Run** `npx vitest run src/viewer/useDieuToc.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement.** State `{ uri: string; toc: TocEntry[] | null } | null`, set only in the promise continuation guarded by an `alive` flag cleared on cleanup (no synchronous `setState` in the effect); return `state?.uri === docUri ? state.toc : null`.
- [ ] **Step 4: Run** the same command, then `npm run lint`. Expected: PASS; lint still 0 errors, 10 warnings.
- [ ] **Step 5: Commit** `feat(viewer): useDieuToc loads the table for one document at a time`.

### Task 5: The sheet

**Files:**
- Create: `src/components/DieuTocSheet.tsx`
- Test: `src/components/DieuTocSheet.test.tsx`

**Interfaces:**
- Consumes: `TocEntry`, `filterToc`, `dieuQuery`, `readingEntries` (Task 1); `GuSheet`.
- Produces:
  ```ts
  export default function DieuTocSheet(props: {
    isOpen: boolean;
    docUri: string | null;          // keys the body
    entries: TocEntry[] | null;     // body renders only when open, docUri set and entries non-empty
    currentPage: number;
    onClose: () => void;
    onJump: (page: number) => void;
  });
  ```

- [ ] **Step 1: Write the failing tests.** Mock `./GuSheet` exactly as `DocSearchSheet.test.tsx` does. Fixture via `buildToc`: Chương I: Điều 1 p1 "Phạm vi điều chỉnh", Điều 2 p2 "Đối tượng áp dụng"; Chương II: Điều 3 p4 "Áp dụng luật", Điều 30 p20 "Tài sản góp vốn". `beforeEach`: `Element.prototype.scrollIntoView = vi.fn()`; `afterEach`: `delete` it and `vi.restoreAllMocks()`.
  - `lists chapters and articles in document order`: `getByText('4 Điều')`; exact `getByText('Chương I')`, `getByText('Chương II')`; buttons named `/^Nhảy tới/` in order `['Nhảy tới Điều 1, trang 1', ..., 'Nhảy tới Điều 30, trang 20']`; `getByText('Áp dụng luật')`, `getByText('tr. 4')`.
  - `filters by number, exact first, chapter on the second line`: change `Lọc theo số Điều` to `'3'` → `getByText('2 Điều khớp')`; button order Điều 3 then Điều 30; `getByText('Chương II · trang 4')`; `queryByText('Chương II')` is `null`; click `Xoá ô lọc` → `getByText('4 Điều')`.
  - `says when no Điều has that number`: `'dieu 999'` → `getByText('Không có Điều nào số “999”')`.
  - `tapping an Điều jumps and closes`: click `Nhảy tới Điều 3, trang 4` → `onJump` called with `4`, `onClose` called once.
  - `marks the Điều being read and follows the page`: `currentPage={4}` → exactly one `getAllByText('đang đọc')`, inside the Điều 3 row (`within(row)`); close, rerender open with `currentPage={20}` → the mark is inside the Điều 30 row.
  - `scrolls the Điều being read into view on open`: `currentPage={4}` → `await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' }))`, and `scrollIntoView.mock.contexts[0]` contains text `Điều 3`.
  - `opens with an empty filter that is not focused`: type `'3'`, rerender closed then open → input value `''`; after the scroll fired, `document.activeElement` is not the input.
  - `renders nothing without entries`: `entries={[]}` → `queryByLabelText('Lọc theo số Điều')` is `null`.
- [ ] **Step 2: Run** `npx vitest run src/components/DieuTocSheet.test.tsx`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement.** `GuSheet` title `Mục lục Điều`, `breakpoint={0.75}`; body keyed by `docUri`, mounted only while open; plain `<input inputMode="numeric">` styled like the search sheet's pill input; rows styled like `DocSearchSheet` hit cards; chapter header rows only when unfiltered and `chapter` differs from the previous row and is non-empty; marked rows get a 3 px `var(--gu-brown)` left border and the `đang đọc` text; scroll effect: when unfiltered at mount, after 350 ms call `scrollIntoView({ block: 'center' })` on the first marked row (ref), cleared on unmount.
- [ ] **Step 4: Run** the same command, then `npm run lint`. Expected: PASS; 0 errors, 10 warnings.
- [ ] **Step 5: Commit** `feat(viewer): Mục lục Điều sheet with number filter and reading mark`.

### Task 6: Viewer wiring

**Files:**
- Modify: `src/components/PdfView.tsx` (Props + `onPageRendered`, the line with `perfEnd('openDoc')`)
- Modify: `src/components/DocPane.tsx` (pass-through prop)
- Modify: `src/pages/ViewerPage.tsx`
- Test: `src/pages/ViewerPage.test.tsx` (new)

**Interfaces:**
- Consumes: `useDieuToc` (Task 4), `DieuTocSheet` (Task 5).
- Produces: `onFirstPaint?: () => void` on `PdfView` and `DocPane`, called once when the first page has rendered.

- [ ] **Step 1: Write the failing tests** in `ViewerPage.test.tsx`. Render like `HomePage.test.tsx`: `IonApp` > `IonReactMemoryRouter` (`initialEntries: ['/viewer/' + encodeUriParam(uri)]`) > `IonRouterOutlet` > `<Route exact path="/viewer/:uri" component={ViewerPage} />`. Mocks: Preferences and `safNative` as usual; `vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })` (unstub in `afterEach`); `./GuSheet` as in Task 5; `../components/DocPane` → a fake rendering `<div data-testid={'pane:' + docUri} data-jump={jumpTo?.page ?? ''}>` with buttons `painted:<docUri>` (calls `onFirstPaint`) and `page4:<docUri>` (calls `onPageChange?.(4, 50)`); `../components/DocPicker` → button `pick` calling `onPick('uri://tra.pdf')`; `../viewer/loadToc` → `vi.fn` resolving the Task 5 fixture for `uri://luat.pdf` and `uri://tra.pdf`, `[]` for `uri://slide.pdf`; `../reading/store` (spread original, `getResumePage: async () => 1`, `recordProgressBestEffort: async () => true`); `../viewer/fontScale` (`getBaseScale: async () => 1`); `../storage/docRepo` (spread original, `resolveDocDisplayName: async () => null`); `../print/printRepo` (spread original, `isPrintFlagged: async () => false`).
  - `shows the button only after the first paint, for a document with Điều`: open `uri://luat.pdf`; after `pane:uri://luat.pdf` appears, `queryByLabelText('Mục lục Điều')` is `null` and `loadToc` not called; click `painted:uri://luat.pdf` → `findByLabelText('Mục lục Điều')`; `loadToc` called with `'uri://luat.pdf'`.
  - `no button for a document without Điều`: open `uri://slide.pdf`, paint → `await waitFor(() => expect(loadToc).toHaveBeenCalled())`, button still absent.
  - `jumps the top pane and marks its page`: paint, click `page4:uri://luat.pdf`, open the sheet → the Điều 3 row holds `đang đọc`; click `Nhảy tới Điều 3, trang 4` → `pane:uri://luat.pdf` has `data-jump="4"`.
  - `split: the divider button serves the bottom pane`: paint top, click `Chia đôi màn hình`, click `pick`; `queryByLabelText('Mục lục Điều của tài liệu tra cứu')` is `null` until `painted:uri://tra.pdf` is clicked; then open it, click `Nhảy tới Điều 30, trang 20` → `pane:uri://tra.pdf` has `data-jump="20"`, `pane:uri://luat.pdf` keeps `data-jump=""`.
  - `swapping the bottom document drops its button`: continuing the split case, click `Đổi tài liệu tra cứu` → divider button gone immediately.
- [ ] **Step 2: Run** `npx vitest run src/pages/ViewerPage.test.tsx`. Expected: FAIL (no `Mục lục Điều` button; fake `onFirstPaint` is `undefined`).
- [ ] **Step 3: Implement.**
  - `PdfView`: optional `onFirstPaint` in `Props`; call `onFirstPaint?.()` right after `perfEnd('openDoc')` inside the `firstPaint` guard. `DocPane`: accept and forward it.
  - `ViewerPage` state: `tocFor: 'top' | 'bottom' | null`, `topPainted: boolean`, `bottomPainted: string | null`, `bottomPage: number`. `const topToc = useDieuToc(topPainted ? docUri : null)`, `const bottomToc = useDieuToc(bottomUri && bottomPainted === bottomUri ? bottomUri : null)`.
  - Top `DocPane`: `onFirstPaint={() => setTopPainted(true)}`. Bottom `DocPane`: `onFirstPaint={() => setBottomPainted(bottomUri)}`, `onPageChange={(p) => setBottomPage(p)}`; `DocPicker` `onPick` also sets `bottomPage` to 1.
  - Footer: when `topToc?.length`, an `IonButton` with `listOutline`, `aria-label="Mục lục Điều"`, same props as the 🔍 button, placed before it, `onClick={() => setTocFor('top')}`.
  - Divider: when `bottomToc?.length`, a `<button>` `Mục lục` before `Tìm`, same style and `onTouchStart` stop as `Tìm`, `onClick={() => setTocFor('bottom')}`.
  - Render `<DieuTocSheet isOpen={tocFor !== null} docUri={tocFor === 'bottom' ? bottomUri : tocFor === 'top' ? docUri : null} entries={tocFor === 'bottom' ? bottomToc : topToc} currentPage={tocFor === 'bottom' ? bottomPage : currentPage} onClose={() => setTocFor(null)} onJump={(p) => (tocFor === 'bottom' ? setBottomJumpTo({ page: p }) : setJumpTo({ page: p }))} />` next to `DocSearchSheet`.
- [ ] **Step 4: Run** `npm test`, `npx tsc -b`, `npm run lint`. Expected: all tests pass; tsc clean; lint 0 errors, 10 warnings.
- [ ] **Step 5: Commit** `feat(viewer): Mục lục Điều entry in the footer and on the split divider`.

### Task 7: Close-out

**Files:**
- Modify: `Docs/claude/lessons.md` ("Việc còn mở": the beat is on `feat/muc-luc-dieu`, waiting for device checks; add under architecture one line on the TOC read after first paint)
- Create: `Docs/claude/handoff/feat-muc-luc-dieu.md` (template in `Docs/claude/handoff/README.md`; `base: bfd2d93`; `status: ready-for-device`; device checks from spec §8; open questions)

- [ ] **Step 1:** Run `npm test`, `npx tsc -b`, `npm run lint`; record the real counts.
- [ ] **Step 2:** Write the two docs with those counts (one line per paragraph, no em dash; `grep -c $'\u2014'` on both returns 0).
- [ ] **Step 3: Commit** `docs(claude): handoff and lessons for the Mục lục Điều branch`, then `git push -u origin feat/muc-luc-dieu`.
