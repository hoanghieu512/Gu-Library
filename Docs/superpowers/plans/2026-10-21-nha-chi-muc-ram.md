# Nhả chỉ mục tìm kiếm khỏi RAM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Search screen drops its whole-kho index from RAM 3 minutes after the screen is left, or at once when the app goes to the background, and reloads it on return under the old result list.

**Architecture:** A pure hold/release rule (`src/search/indexHold.ts`) drives a hook that owns the index and its single-flight loads (`src/search/useSearchIndex.ts`); `SearchPage` only wires Ionic lifecycle, Capacitor `pause`/`resume` and a new "index cleared" signal from `store.ts` to the rule.

**Tech Stack:** Ionic React 8, React 19, Capacitor 8 (`@capacitor/app`), TypeScript, vitest + Testing Library (jsdom).

**Spec:** `Docs/superpowers/specs/2026-10-21-nha-chi-muc-ram-design.md`

## Global Constraints

- No em dash (U+2014) in anything new: code, comments, docs. A touched paragraph that has one gets rewritten.
- Code, comments, commit messages in English; no new UI text. The only status text used is the existing `đang cập nhật chỉ mục…`.
- Do not change the index format, `SCHEMA`, `loadIndex`/`refreshIndex` behaviour, the sidecar read path, `src/search/docIndex.ts`, `DocSearchSheet`, Mục lục Điều; no version bump, no `notes.ts`, `CHANGELOG.md`, ops doc.
- Never two index loads at once; a load or refresh that lands after `release()` never sets state (except build progress numbers).
- `HOLD_MS = 3 * 60_000`.
- Tests: Preferences and `safNative` faked as in `CLAUDE.md`; globals stubbed or spied are restored in `afterEach`; fake timers turned off in `afterEach`.
- `npm run lint`: 0 errors and exactly 10 warnings.

## Review Focus

- Leaving and re-entering repeatedly inside 3 minutes must never start a second load nor leave a stray timer: test in Task 1 (`leave` twice keeps one timer; `enter` after `leave` cancels).
- `pause` during the very first load (index never attached yet) then `resume` on Search must still end with an index: test in Task 3 (release during first load, acquire again, second load attaches).
- A refresh that changed the index but landed after `release()` must not put the index back: test in Task 3 (late refresh result dropped).
- Typing while released must not show "Không tìm thấy đoạn nào" for a query that was never searched: test in Task 4 (empty-state absent while reloading).
- "Dựng lại chỉ mục" while the index is held must make the next entry build, not show the old index: test in Task 4.

---

### Task 1: Hold/release rule

**Files:**
- Create: `src/search/indexHold.ts`
- Test: `src/search/indexHold.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const HOLD_MS: number; // 180_000
  export interface IndexHold { enter(): void; leave(): void; pause(): void; resume(): void; invalidate(): void; dispose(): void }
  export function createIndexHold(actions: { acquire: () => void; release: () => void }, holdMs?: number): IndexHold;
  ```

- [ ] **Step 1: Write the failing tests.** `beforeEach(() => vi.useFakeTimers())`, `afterEach(() => vi.useRealTimers())`; `const acquire = vi.fn(), release = vi.fn(); const h = createIndexHold({ acquire, release })`.
  - `enter acquires once, however often it is called`: `h.enter(); h.enter()` → `acquire` 1 call.
  - `leaving for HOLD_MS releases once`: enter, leave, `vi.advanceTimersByTime(HOLD_MS - 1)` → `release` 0; `advanceTimersByTime(1)` → 1; another `advanceTimersByTime(HOLD_MS)` → still 1.
  - `coming back before HOLD_MS keeps the index`: enter, leave, advance `HOLD_MS - 1`, enter, advance `HOLD_MS` → `release` 0, `acquire` 1.
  - `leaving twice keeps one timer`: enter, leave, advance 60_000, leave, advance `HOLD_MS - 60_000` → `release` 0; advance 60_000 → 1.
  - `entering after a release acquires again`: enter, leave, advance `HOLD_MS`, enter → `acquire` 2.
  - `pause releases at once, even on Search`: enter, pause → `release` 1; pause again → still 1.
  - `resume acquires only on Search`: enter, pause, resume → `acquire` 2; then leave, pause, resume → `acquire` stays 2.
  - `pause cancels a pending timer`: enter, leave, pause → `release` 1; advance `HOLD_MS` → still 1.
  - `invalidate releases, and acquires again on Search`: enter, invalidate → `release` 1, `acquire` 2; leave, invalidate → `release` 2, `acquire` 2; then enter → `acquire` 3.
  - `invalidate with nothing held only re-acquires on Search`: (never entered) invalidate → both 0.
  - `dispose cancels the timer`: enter, leave, dispose, advance `HOLD_MS` → `release` 0.
  - `a custom hold time`: `createIndexHold({ acquire, release }, 1000)`: enter, leave, advance 1000 → `release` 1.
- [ ] **Step 2: Run** `npx vitest run src/search/indexHold.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** per spec §4.1 (state `visible`, `held`, one `setTimeout` handle).
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(search): hold/release rule for the search index`.

### Task 2: "Index cleared" signal

**Files:**
- Modify: `src/search/store.ts` (`clearIndex`, new export after it)
- Test: `src/search/store.test.ts`

**Interfaces:**
- Produces: `export function onIndexCleared(cb: () => void): () => void` (window event `gulib:search-index-cleared`, like `src/lib/khoEvents.ts`); `clearIndex()` dispatches it after its delete attempt, also when IndexedDB fails.

- [ ] **Step 1: Write the failing tests** in `describe('clearIndex: tells the Search screen')`:
  - `calls listeners after clearing`: `vi.stubGlobal('indexedDB', { open: () => { throw new Error('no idb'); } })` (unstub in `afterEach`); `const cb = vi.fn(); const off = onIndexCleared(cb); await clearIndex()` → `cb` 1 call; `off(); await clearIndex()` → still 1.
- [ ] **Step 2: Run** `npx vitest run src/search/store.test.ts`. Expected: FAIL, `onIndexCleared` is not exported.
- [ ] **Step 3: Implement** in `store.ts`; dispatch in a `finally` (or after the existing `catch`) so a failed delete still signals.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(search): clearIndex signals that the stored index is gone`.

### Task 3: Hook that owns the index

**Files:**
- Create: `src/search/useSearchIndex.ts`
- Test: `src/search/useSearchIndex.test.ts`

**Interfaces:**
- Consumes: `loadIndex`, `refreshIndex`, `RefreshProgress` from `./store` (unchanged).
- Produces:
  ```ts
  export type Phase = 'loading' | 'building' | 'ready';
  export function useSearchIndex(onNames: (names: Map<string, string>) => void): {
    ix: SearchIndex | null; phase: Phase; progress: { done: number; total: number }; refreshing: boolean;
    acquire: () => void; release: () => void;   // same identity across renders
  };
  ```

- [ ] **Step 1: Write the failing tests** with `vi.mock('./store', () => ({ loadIndex: vi.fn(), refreshIndex: vi.fn() }))`; each call returns a promise the test resolves or rejects (store the resolvers in arrays). Fixture: `const index = mergeShards([indexDoc(DOC, { units: [{ label: 'Điều 5', page: 3, text: 'Người sử dụng đất.' }] })])`; `cached = { index, builtAt: 1, stamps: new Map([['u:a.json', '1:1']]) }`; `unchanged = { changed: false, names: new Map(), read: 0, reused: 1, total: 1, ms: 0 }`. All `act` around acquire/release/resolution.
  - `first load: loading, then ready with the index`: `acquire()` → `phase` `'loading'`; resolve `loadIndex` with `cached` → `ix` is `index`, `phase` `'ready'`, `refreshing` true, `refreshIndex` called with `cached.stamps`; resolve refresh with `unchanged` (with `names` holding one entry) → `refreshing` false, `onNames` called with that map.
  - `release drops the index`: after the above, `release()` → `ix` null.
  - `a load that lands after release is not attached`: `acquire()`, `release()`, resolve `loadIndex` with `cached` → `ix` null, `refreshIndex` never called.
  - `a refresh that lands after release is not attached`: acquire, resolve load, `release()`, resolve refresh with `{ ...unchanged, changed: true, index: mergeShards([]), stamps: new Map() }` → `ix` null, `onNames` not called.
  - `acquire while a load runs waits for it`: `acquire()`, `release()`, `acquire()` → `loadIndex` 1 call; resolve the first with `cached` → `loadIndex` 2 calls; resolve the second with `cached`, then its refresh with `unchanged` → `ix` is `index`.
  - `a later load shows refreshing, not loading`: acquire, resolve load and refresh; `release()`; `acquire()` → `phase` `'ready'`, `refreshing` true, `ix` null before the second load resolves.
  - `an empty store builds with progress`: `loadIndex` resolves `null` → `phase` `'building'`, `refreshIndex` called with `(undefined, expect.any(Function))`; call that callback with `{ done: 1, total: 2, reused: 0 }` → `progress` `{ done: 1, total: 2 }`; resolve with `{ ...unchanged, changed: true, index, stamps: new Map() }` → `ix` is `index`, `phase` `'ready'`.
  - `a build released midway keeps its progress, then the next load reads the store`: `loadIndex` resolves `null` (build starts); `release()`; `acquire()`; call the build's progress callback with `{ done: 2, total: 2, reused: 0 }` → `progress` `{ done: 2, total: 2 }`; resolve the build with an index → `ix` still null and `loadIndex` 2 calls; resolve that with `cached` → `ix` is `index`.
  - `a failed refresh keeps the index`: resolve load with `cached`, reject refresh → `ix` is `index`, `refreshing` false.
  - `acquire and release keep their identity`: `rerender()` → same function objects.
- [ ] **Step 2: Run** `npx vitest run src/search/useSearchIndex.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement.** Refs: `gen` (number), `chain` (`Promise<void>`, starts resolved), `stamps` (`Map | null`), `started` (any acquire happened before). `acquire`: take `my = ++gen.current`; if `started` set `refreshing` true now; set `started`; `chain.current = chain.current.then(() => run(my))`. `run(my)`: return at once if `my !== gen.current`; then the old `SearchPage` mount flow, every state write guarded by `my === gen.current` except `setProgress`. `release`: `gen.current++`, `setIx(null)`. Both with `useCallback(..., [])`; read `onNames` through a ref. Keep the old comments that explain the flow, moved from `SearchPage`.
- [ ] **Step 4: Run** the same command, then `npm run lint`. Expected: PASS; lint 0 errors, 10 warnings.
- [ ] **Step 5: Commit** `feat(search): useSearchIndex owns the index with single-flight loads`.

### Task 4: Search screen wiring

**Files:**
- Modify: `src/pages/SearchPage.tsx`
- Test: `src/pages/SearchPage.test.tsx` (new)

**Interfaces:**
- Consumes: `createIndexHold`, `HOLD_MS` (Task 1); `onIndexCleared`, `clearIndex` (Task 2); `useSearchIndex` (Task 3).

- [ ] **Step 1: Write the failing tests.** Render as `HomePage.test.tsx`: `IonApp` > `IonReactMemoryRouter` (`/search`) > `IonRouterOutlet` > `Route exact path="/search" component={SearchPage}`. Mocks: Preferences and `safNative` as usual; `@ionic/react` spread from the original with `useIonViewWillEnter: (cb) => { life.enter = cb; }` and `useIonViewDidLeave: (cb) => { life.leave = cb; }` (`life` from `vi.hoisted`; in jsdom the real `useIonViewDidLeave` does not fire on push, only late on back); `@capacitor/app` with `App.addListener: async (ev, cb) => { app[ev] = cb; return { remove() {} }; }`; `../search/store` spread from the original (so `clearIndex`/`onIndexCleared` are real) with `loadIndex`/`refreshIndex` as `vi.fn` returning promises the test controls (defaults: `loadIndex` resolves the Task 3 `cached` fixture, `refreshIndex` resolves `unchanged`). Fixture document name `Luật Đất đai`, unit text `Người sử dụng đất được cấp giấy chứng nhận.` Type with `fireEvent.change(getByLabelText('Tìm trong tài liệu'), { target: { value: 'dat' } })` and `findByText('Luật Đất đai')`. Fake timers only around the hold: `vi.useFakeTimers(); act(() => { life.leave(); vi.advanceTimersByTime(HOLD_MS); }); vi.useRealTimers()`; `afterEach` restores real timers and unstubs.
  - `coming back after three minutes reloads under the old results`: type `dat`, see the card; leave + `HOLD_MS`; next `loadIndex` held pending; `act(() => life.enter())` → `getByText('đang cập nhật chỉ mục…')` and the card `Luật Đất đai` still present, `loadIndex` 2 calls; resolve it → `findByText('1 đoạn · 1 tài liệu')`.
  - `coming back within three minutes keeps the index`: type, leave, advance `HOLD_MS - 1`, enter → `loadIndex` 1 call, no `đang cập nhật chỉ mục…`.
  - `pause on Search releases at once and resume reloads`: type, `act(() => app.pause())`, `act(() => app.resume())` → `loadIndex` 2 calls, the card still present.
  - `a new query typed while reloading hides the old results`: type `dat`, leave + `HOLD_MS`, pending `loadIndex`, enter, change the input to `nguoi su dung` → `queryByText('Luật Đất đai')` null and `queryByText('Không tìm thấy đoạn nào')` null; resolve → `findByText('Luật Đất đai')`.
  - `clearing the index makes the next entry build`: type, leave; `await act(() => clearIndex())`; next `loadIndex` resolves `null`, next `refreshIndex` pending; enter → `findByText('Đang đọc kho lần đầu nha dợ iu')`, `refreshIndex` last called with `(undefined, expect.any(Function))`.
- [ ] **Step 2: Run** `npx vitest run src/pages/SearchPage.test.tsx`. Expected: FAIL (the first, third, fourth and fifth cases: `loadIndex` called once, old list hidden, or no build screen).
- [ ] **Step 3: Implement** per spec §4.4: `useSearchIndex(setNames)`; `const [hold] = useState(() => createIndexHold({ acquire, release }))`; effect on mount `hold.enter()`, cleanup `hold.dispose()`; `useIonViewWillEnter(() => hold.enter())`; `useIonViewDidLeave(() => hold.leave())`; effect adding `App.addListener('pause', () => hold.pause())` and `'resume'` → `hold.resume()`, removed on unmount like `HomePage`; effect `onIndexCleared(() => hold.invalidate())`. `result` becomes `{ q, r }`; the debounce effect stores `{ q, r }`; the list and counts use `shown = ix || result.q === q ? result.r : NO_RESULT`. Drop the old mount effect, `alive`, `stamps` and the `Phase` type from the page (they moved to Task 3). Rewrite the page's header comment only if it gains an em dash.
- [ ] **Step 4: Run** `npm test`, `npx tsc -b`, `npm run lint`. Expected: all pass; tsc clean; lint 0 errors, 10 warnings.
- [ ] **Step 5: Commit** `fix(search): release the index 3 minutes after leaving Search or when the app is paused`.

### Task 5: Close-out

**Files:**
- Modify: `Docs/claude/lessons.md` (architecture line on the hold/release rule; "Việc còn mở": the RAM item is on `fix/search-index-ram`, waiting for device measurements; the jsdom Ionic lifecycle finding under "Bẫy test")
- Create: `Docs/claude/handoff/fix-search-index-ram.md` (template in `Docs/claude/handoff/README.md`; `base: c3e5f0e`; `status: ready-for-device`; device checks from spec §7 and the brief's local section; open questions)

- [ ] **Step 1:** Run `npm test`, `npx tsc -b`, `npm run lint`; record the real counts.
- [ ] **Step 2:** Write both docs with those counts (one line per paragraph; `grep -c $'\u2014'` returns 0 on both).
- [ ] **Step 3: Commit** `docs(claude): handoff and lessons for releasing the search index`, then `git push -u origin fix/search-index-ram`.
