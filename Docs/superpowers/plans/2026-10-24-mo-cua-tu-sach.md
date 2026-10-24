# Bookcase Doors Opening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On every cold start, two wooden bookcase doors with the panda judge in front cover the screen while Home loads the kho, then swing open onto the real Home; skippable, switchable off in Settings, never on resume, share intents or after a renderer crash.

**Architecture:** A pure state machine (`src/opening/openingMachine.ts`) driven by a small signal module (`src/opening/homeReady.ts`) that Home, ShareReceiver and CrashNotice talk to; one overlay component (`src/opening/OpeningDoors.tsx` + `opening.css`) mounted once in `App.tsx`, animating only `transform`/`opacity` with CSS keyframes; a Preferences switch (`src/opening/openingPref.ts`) with a Settings row. Native splash, WebView background and `index.html` share the cream so nothing flashes white. Two still images (one door, mirrored; one panda) are generated through OpenRouter and cut by a one-off script.

**Tech Stack:** Capacitor 8 (Android), Ionic React 8, React 19, TypeScript, CSS keyframes, vitest + Testing Library (jsdom); Node `fetch` and Python Pillow (throwaway venv) for the asset scripts.

**Spec:** `Docs/superpowers/specs/2026-10-24-mo-cua-tu-sach-design.md`

## Global Constraints

- No em dash (U+2014) anywhere: code, comments, UI text, docs, commit messages.
- Code, comments, commit messages in English; UI text in Vietnamese. New Markdown files: one line per paragraph or list item; `e2e/README.md` and the ops doc keep their own ~100-char wrapping.
- No new entry in `package.json` (dependencies or devDependencies). Asset scripts use Node built-ins; Pillow/numpy live in a throwaway venv, as for `scripts/make-press-sprites.py`.
- Exact copy: overlay button `aria-label="Bỏ qua hiệu ứng mở cửa"`; plaque text `Gú's Library`; Settings row title `Hiệu ứng mở cửa`, hint `Cửa tủ sách mở ra mỗi lần khởi động app`, row `aria-label` `Hiệu ứng mở cửa: bật` / `Hiệu ứng mở cửa: tắt`, icon `enterOutline`.
- Values: `MIN_SHOWN_MS = 400`, `DEADLINE_MS = 2500` (from mount), `OPEN_MS = 1000` (doors 700 + fade 300), `FAST_MS = 200`, `DOORS_FADE_IN_MS = 150`, fallback timer = duration + 300 ms. Cream `#E9E5CD`, gold `#e7c56e`, door wood `#825731` to `#5b3d1c`. Preferences key `opening_doors`, value `'off'` (absent = on).
- Hardware back while the doors live: `ionBackButton` handler at priority **110** (spec said 100; raised above Ionic's own overlay priority 100 so the doors always win), never calls `processNextHandler`.
- Overlay `z-index: 30000` (Ionic overlays start at 20000). Animate only `transform` and `opacity`; no `filter`/blur, no animated `box-shadow`, no Web Animations API (`element.animate` is missing in jsdom).
- `npm run lint`: 0 errors and still exactly 10 warnings. `npx tsc -b` clean. `npm test` green.
- Tests: Preferences via `vi.mock('@capacitor/preferences', () => import('../test/fakePreferences'))` (or a local `vi.fn` mock as in `WhatsNewNotice.test.tsx`); globals stubbed with `vi.stubGlobal` and restored in `afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); })`; `resetOpeningForTest()` in `beforeEach` of every test that touches `src/opening`.
- Until Task 11, do not touch `package.json` version, `src/whatsNew/notes.ts`, `CHANGELOG.md`, `Docs/gu-library-ops-qa-prod.md`.
- OpenRouter: key only from `process.env.OPENROUTER_API_KEY`, never printed, logged or written; total spend for the beat at most 3 USD; generated source images live outside the repo and are never committed.
- Devices: UBS1 may be force-stopped; dGen1 is **never** force-stopped (WebView goes black until reboot); open apps with `adb shell monkey -p com.gulibrary.app -c android.intent.category.LAUNCHER 1`.

## Review Focus

- A Preferences read that never settles must end the overlay at the deadline with no doors appearing late: test in Task 5.
- After the doors are gone, the hardware back button must reach the normal back handler again (the `ionBackButton` listener is removed): test in Task 5.
- A tap on the plain cream cover (before the doors are decided) must go straight to Home, never a fast-open of doors that were never shown: tests in Task 2 and Task 5.
- With the switch off (or reduced motion), "Có gì mới" and the crash alert must still appear, at once: test in Task 6 (both wait on `whenOpeningDone()`).
- A share or crash flag that arrives before the overlay subscribes must still suppress the doors (replayed on subscribe), and a share received on a later resume must not resurrect them: tests in Task 3 and Task 6.

---

### Task 1: Baseline on 1.43.1 (local, UBS1)

**Files:**
- Create: `Docs/perf/2026-10-24-opening-doors.md`

**Interfaces:**
- Produces: baseline numbers that Task 10 compares against.

- [ ] **Step 1: Confirm UBS1 runs 1.43.1 and huynh is done with it**

Run: `adb -s UBS1240902002011 shell dumpsys package com.gulibrary.app | grep versionName`
Expected: `versionName=1.43.1`. Ask huynh before force-stopping (the What's New sheet was open on it on 24/10).

- [ ] **Step 2: Record 3 cold starts**

For each run: `adb shell am force-stop com.gulibrary.app`, start `adb shell screenrecord --bit-rate 8000000 /sdcard/cold.mp4` in the background, `monkey` open, wait 6 s, stop the recording, `adb pull`. Get frame times with `ffprobe -v error -select_streams v -show_entries frame=pts_time -of csv=p=0 cold.mp4` and extract the frames (`ffmpeg -i cold.mp4 -vsync 0 f%03d.png`). With t0 = the first frame showing the splash, read: when the splash ends, whether any white (or other non-cream) frame follows and for how long, and when the shelf is first drawn.

- [ ] **Step 3: Write the baseline**

`Docs/perf/2026-10-24-opening-doors.md`: device, build, method, the three runs (splash end, white gap yes/no and length, Home drawn), median. Leave a heading "A/B with the doors" for Task 10.

- [ ] **Step 4: Commit**

```bash
git add Docs/perf/2026-10-24-opening-doors.md
git commit -m "docs(perf): cold-start baseline on 1.43.1 before the opening doors"
```

### Task 2: State machine

**Files:**
- Create: `src/opening/openingMachine.ts`
- Test: `src/opening/openingMachine.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const MIN_SHOWN_MS = 400; export const DEADLINE_MS = 2500; export const OPEN_MS = 1000;
  export const FAST_MS = 200; export const DOORS_FADE_IN_MS = 150; export const FALLBACK_SLACK_MS = 300;
  export type OpeningState = 'cover' | 'closed' | 'opening' | 'fastOpen' | 'done';
  export type SkipReason = 'tap' | 'back' | 'share' | 'crash';
  export type OpeningEvent =
    | { type: 'start'; play: boolean } | { type: 'homeReady' } | { type: 'minElapsed' }
    | { type: 'deadline' } | { type: 'skip'; reason: SkipReason } | { type: 'animEnd' };
  export interface OpeningModel { state: OpeningState; homeReady: boolean; minElapsed: boolean }
  export function initialModel(): OpeningModel;
  export function step(m: OpeningModel, e: OpeningEvent): OpeningModel;
  ```

- [ ] **Step 1: Write the failing tests** (`describe('openingMachine')`, a helper `run(...events)` folding `step` from `initialModel()`)

```ts
it('start without play ends at once', () => expect(run({ type: 'start', play: false }).state).toBe('done'));
it('start with play closes the doors', () => expect(run({ type: 'start', play: true }).state).toBe('closed'));
it('opens only when Home is ready AND the minimum time has passed', () => {
  expect(run(START, { type: 'homeReady' }).state).toBe('closed');
  expect(run(START, { type: 'minElapsed' }).state).toBe('closed');
  expect(run(START, { type: 'homeReady' }, { type: 'minElapsed' }).state).toBe('opening');
  expect(run(START, { type: 'minElapsed' }, { type: 'homeReady' }).state).toBe('opening');
});
it('Home ready before the doors showed still counts', () =>
  expect(run({ type: 'homeReady' }, START, { type: 'minElapsed' }).state).toBe('opening'));
it('deadline: cover ends, closed opens, opening stays', () => {
  expect(run({ type: 'deadline' }).state).toBe('done');
  expect(run(START, { type: 'deadline' }).state).toBe('opening');
  expect(run(START, HOME, MIN, { type: 'deadline' }).state).toBe('opening');
});
it('skip: cover ends, closed and opening fast-open, fastOpen stays', () => {
  expect(run(SKIP).state).toBe('done');
  expect(run(START, SKIP).state).toBe('fastOpen');
  expect(run(START, HOME, MIN, SKIP).state).toBe('fastOpen');
  expect(run(START, SKIP, SKIP).state).toBe('fastOpen');
});
it('animEnd finishes opening and fastOpen, is ignored while closed', () => {
  expect(run(START, HOME, MIN, END).state).toBe('done');
  expect(run(START, SKIP, END).state).toBe('done');
  expect(run(START, END).state).toBe('closed');
});
it('done ignores everything', () => {
  for (const e of [START, HOME, MIN, SKIP, END, { type: 'deadline' } as const])
    expect(run({ type: 'start', play: false }, e).state).toBe('done');
});
it('step does not mutate its input', () => {
  const m = initialModel(); const copy = { ...m }; step(m, START); expect(m).toEqual(copy);
});
```
(`START = { type: 'start', play: true }`, `HOME = { type: 'homeReady' }`, `MIN = { type: 'minElapsed' }`, `SKIP = { type: 'skip', reason: 'tap' }`, `END = { type: 'animEnd' }`.)

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/opening/openingMachine.test.ts`
Expected: FAIL, cannot resolve `./openingMachine`.

- [ ] **Step 3: Implement `initialModel` and `step` in `src/opening/openingMachine.ts`**

Rules exactly as spec §5.1; `homeReady`/`minElapsed` only set flags, and any event that leaves `closed` with both flags set moves to `opening`. Header comment: one line per state saying what is on screen.

- [ ] **Step 4: Run to see them pass**

Run: `npx vitest run src/opening/openingMachine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/opening/openingMachine.ts src/opening/openingMachine.test.ts
git commit -m "feat(opening): state machine for the bookcase doors"
```

### Task 3: Signals between the app and the doors

**Files:**
- Create: `src/opening/homeReady.ts`
- Test: `src/opening/homeReady.test.ts`

**Interfaces:**
- Consumes: `OpeningEvent`, `SkipReason` (Task 2).
- Produces (spec's `openingDone` constant becomes a function so tests can reset it):
  ```ts
  export function markHomeReady(): void;                                   // idempotent
  export function skipOpening(reason: SkipReason): void;                   // every call emits; first reason kept for replay
  export function subscribeOpening(listener: (e: OpeningEvent) => void): () => void; // replays homeReady and skip synchronously
  export function finishOpening(): void;                                   // idempotent
  export function whenOpeningDone(): Promise<void>;                        // same promise until reset
  export function resetOpeningForTest(): void;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
it('replays homeReady to a late subscriber, once', () => {
  markHomeReady(); markHomeReady();
  const seen: OpeningEvent[] = []; subscribeOpening((e) => seen.push(e));
  expect(seen).toEqual([{ type: 'homeReady' }]);
});
it('replays the first skip reason to a late subscriber', () => {
  skipOpening('share'); skipOpening('crash');
  const seen: OpeningEvent[] = []; subscribeOpening((e) => seen.push(e));
  expect(seen).toEqual([{ type: 'skip', reason: 'share' }]);
});
it('delivers live events and stops after unsubscribe', () => {
  const seen: OpeningEvent[] = []; const off = subscribeOpening((e) => seen.push(e));
  skipOpening('tap'); off(); markHomeReady();
  expect(seen).toEqual([{ type: 'skip', reason: 'tap' }]);
});
it('whenOpeningDone resolves once, on the first finishOpening', async () => {
  const cb = vi.fn(); whenOpeningDone().then(cb);
  await Promise.resolve(); expect(cb).not.toHaveBeenCalled();
  finishOpening(); finishOpening(); await whenOpeningDone(); expect(cb).toHaveBeenCalledTimes(1);
});
it('reset gives a fresh pending promise and clears the flags', async () => {
  markHomeReady(); finishOpening(); resetOpeningForTest();
  const seen: OpeningEvent[] = []; subscribeOpening((e) => seen.push(e)); expect(seen).toEqual([]);
  const cb = vi.fn(); whenOpeningDone().then(cb); await Promise.resolve(); expect(cb).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/opening/homeReady.test.ts`
Expected: FAIL, cannot resolve `./homeReady`.

- [ ] **Step 3: Implement `src/opening/homeReady.ts`**

Module state: `homeReadyFlag`, `firstSkip: SkipReason | null`, a `Set` of listeners, and a deferred promise (`resolve` kept). No React, no Capacitor import.

- [ ] **Step 4: Run to see them pass**

Run: `npx vitest run src/opening/homeReady.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/opening/homeReady.ts src/opening/homeReady.test.ts
git commit -m "feat(opening): signals so Home, share and crash notices can steer the doors"
```

### Task 4: The switch and its Settings row

**Files:**
- Create: `src/opening/openingPref.ts`
- Test: `src/opening/openingPref.test.ts`
- Modify: `src/pages/SettingsPage.tsx` (new row after "Cỡ chữ Viewer")
- Test: `src/pages/SettingsPage.test.tsx` (new `describe`)

**Interfaces:**
- Produces:
  ```ts
  export const OPENING_PREF_KEY = 'opening_doors';
  export async function getOpeningEnabled(): Promise<boolean>; // absent → true, 'off' → false; rejects when Preferences rejects
  export async function setOpeningEnabled(on: boolean): Promise<void>; // on → remove the key, off → set 'off'
  ```

- [ ] **Step 1: Write the failing tests**

`openingPref.test.ts` (fakePreferences): default `true`; `setOpeningEnabled(false)` leaves `prefs.get('opening_doors') === 'off'` and `getOpeningEnabled()` → `false`; `setOpeningEnabled(true)` removes the key; `vi.spyOn(Preferences, 'get').mockRejectedValueOnce(new Error('x'))` → `getOpeningEnabled()` rejects.

`SettingsPage.test.tsx`, `describe('SettingsPage: "Hiệu ứng mở cửa"')`:
```ts
it('shows on by default and turns off on tap', async () => {
  render(<SettingsPage />);
  const row = await screen.findByRole('button', { name: 'Hiệu ứng mở cửa: bật' });
  fireEvent.click(row);
  await screen.findByRole('button', { name: 'Hiệu ứng mở cửa: tắt' });
  expect(prefs.get('opening_doors')).toBe('off');
});
it('shows off when stored off, and back on after a tap', async () => {
  prefs.set('opening_doors', 'off');
  render(<SettingsPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Hiệu ứng mở cửa: tắt' }));
  await screen.findByRole('button', { name: 'Hiệu ứng mở cửa: bật' });
  expect(prefs.has('opening_doors')).toBe(false);
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/opening/openingPref.test.ts src/pages/SettingsPage.test.tsx`
Expected: FAIL (module missing; row not found).

- [ ] **Step 3: Implement `openingPref.ts`, then the row**

Row: `SettingsRow` with `icon={enterOutline}`, title and hint from Global Constraints, `onClick` flips the state and calls `setOpeningEnabled`, `ariaLabel` from Global Constraints, `trailing={<IonToggle checked={on} aria-hidden style={{ pointerEvents: 'none' }} />}` (the whole row is the control; the toggle only shows the state). Load the stored value in the page's existing mount effect; a read error shows "tắt" (the doors do not play on a read error either). Check `grep -rn enterOutline src` finds no other use first.

- [ ] **Step 4: Run to see them pass, plus lint**

Run: `npx vitest run src/opening/openingPref.test.ts src/pages/SettingsPage.test.tsx && npm run lint`
Expected: PASS; lint 0 errors, 10 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/opening/openingPref.ts src/opening/openingPref.test.ts src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "feat(settings): switch for the opening doors, on by default"
```

### Task 5: The doors overlay

**Files:**
- Create: `src/opening/OpeningDoors.tsx`, `src/opening/opening.css`, `src/opening/art.ts`
- Test: `src/opening/OpeningDoors.test.tsx`
- Modify: `src/App.tsx` (mount `<OpeningDoors />` inside `IonApp`, before `<IonReactRouter>`), `src/App.test.tsx` (the title assertion)

**Interfaces:**
- Consumes: Task 2 (`step`, `initialModel`, constants), Task 3 (`subscribeOpening`, `finishOpening`; tests also use `markHomeReady`, `skipOpening`, `whenOpeningDone`, `resetOpeningForTest`), Task 4 (`getOpeningEnabled`).
- Produces: `export default function OpeningDoors()` (no props; renders the overlay or `null`); `art.ts`: `export const DOOR_SRC: string | null` (null = CSS placeholder door) and `export const PANDA_SRC: string` (placeholder: `import pandaHead from '../../assets/icon-foreground.png'`). Task 9 swaps these two constants only.

- [ ] **Step 1: Write the failing tests** (`vi.useFakeTimers()`; `vi.mock('./openingPref', () => ({ getOpeningEnabled: vi.fn() }))`; `vi.stubGlobal('matchMedia', () => ({ matches: false }))`; helper `flush = () => act(() => vi.advanceTimersByTimeAsync(0))`; `const btn = () => screen.queryByRole('button', { name: 'Bỏ qua hiệu ứng mở cửa' })`; state read from the button's class `gu-opening--<state>`)

- `'switch off: no doors, done at once'`: `getOpeningEnabled` resolves `false` → after `flush`, `btn()` is null and `whenOpeningDone()` resolves.
- `'reduced motion: no doors'`: `matchMedia` returns `{ matches: true }` → same as above; `getOpeningEnabled` need not be called.
- `'read error: no doors'`: `getOpeningEnabled` rejects → same.
- `'image decode failure: no doors'`: `Object.defineProperty(HTMLImageElement.prototype, 'decode', { value: () => Promise.reject(new Error('x')), configurable: true })` (deleted again in `afterEach`), read resolves `true` → same as above.
- `'read that never settles: gone at the deadline, doors never shown'`: returns `new Promise(() => {})`; before 2500 ms the button has class `gu-opening--cover`; advance 2500 → `btn()` null.
- `'opens after Home ready and 400 ms, then leaves the DOM'`: resolves `true` → `flush` → `gu-opening--closed`; advance 399 → still closed; `markHomeReady()` + advance 1 → `gu-opening--opening`; advance `OPEN_MS + FALLBACK_SLACK_MS` → `btn()` null; `whenOpeningDone()` resolves.
- `'Home ready early still waits 400 ms'`: `markHomeReady()` before render → closed until 400 ms, opening at 400.
- `'deadline opens without Home ready'`: closed at 2499 ms from mount, opening at 2500.
- `'tap on the doors fast-opens'`: closed → `fireEvent.click(btn())` → `gu-opening--fastOpen` → advance `FAST_MS + FALLBACK_SLACK_MS` → null.
- `'tap on the cover goes straight to Home'`: pending read → click while `gu-opening--cover` → `btn()` null at once (no `fastOpen`).
- `'back button skips at priority 110 and swallows the press'`: closed → `document.dispatchEvent(new CustomEvent('ionBackButton', { detail: { register } }))` with `register = vi.fn()`; `expect(register).toHaveBeenCalledWith(110, expect.any(Function))`; calling the handler with `processNext = vi.fn()` → `fastOpen`, `processNext` not called.
- `'back button after the doors are gone is not intercepted'`: run to done → dispatch the event again → `register` not called.
- `'skip before mount: no doors'`: `skipOpening('share')` before render, read resolves `true` → `btn()` null after `flush`.
- `'unmount mid-way leaves no timers and finishes'`: closed → `unmount()` → `vi.getTimerCount()` is 0, `whenOpeningDone()` resolves.
- `'nothing brings it back after done'`: done → `markHomeReady(); skipOpening('tap')` → `btn()` stays null.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/opening/OpeningDoors.test.tsx`
Expected: FAIL, cannot resolve `./OpeningDoors`.

- [ ] **Step 3: Implement `OpeningDoors.tsx`**

- `useReducer(step, undefined, initialModel)`. One mount effect: start the `DEADLINE_MS` timer, `subscribeOpening(dispatch)`, then decide asynchronously: reduced motion = `window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false`; enabled = `await getOpeningEnabled()` (rejection = false); when playing, `await Promise.all` of `img.decode?.()` on `new Image()` objects for `DOOR_SRC` (if not null) and `PANDA_SRC` (rejection = no play); then `dispatch({ type: 'start', play })`. Guard every async continuation with an `alive` flag. Dispatch only from callbacks and timers (no new `set-state-in-effect` warnings).
- Effects keyed on `state`: entering `closed` starts the `MIN_SHOWN_MS` timer; entering `opening` / `fastOpen` starts the fallback timer `OPEN_MS + FALLBACK_SLACK_MS` / `FAST_MS + FALLBACK_SLACK_MS` → `animEnd`; `onAnimationEnd` on the root dispatches `animEnd` only for the last animation names (`gu-opening-out`, `gu-opening-fast`). Every timer cleared in its effect cleanup.
- `ionBackButton` listener on `document` while `state !== 'done'`: `detail.register(110, () => dispatch({ type: 'skip', reason: 'back' }))`.
- At `done`: call `finishOpening()` and render `null`; also `finishOpening()` in the mount effect's cleanup.
- Markup: root `<button type="button" className={`gu-opening gu-opening--${state}`} aria-label="Bỏ qua hiệu ứng mở cửa" onClick={skip tap}>`; inside, all `aria-hidden`: `.gu-opening__stage` > `.gu-opening__door--left`, `.gu-opening__door--right` (each holding the door `<img alt="">` when `DOOR_SRC` is set, the right one flipped on the inner `<img>`), `.gu-opening__seam`, `.gu-opening__glow`, `.gu-opening__plaque` (text `Gú's Library`), `<img className="gu-opening__panda" alt="">`. Door images and plaque/panda render from `closed` on; `cover` shows only the cream.

- [ ] **Step 4: Write `opening.css`**

Values from Global Constraints. Root: `position: fixed; inset: 0; z-index: 30000; border: 0; padding: 0; background: #E9E5CD`. Stage `perspective: 1400px`. Left door `transform-origin: left center`, right `right center`, `backface-visibility: hidden`, `will-change: transform`; placeholder door (no image): `linear-gradient(135deg, #825731, #5b3d1c)` with an inset panel border. Keyframes, all on `transform`/`opacity`: `gu-doors-in` (opacity 0→1, 150 ms, entering closed); `gu-panda-bob` (translateY 0 → -6px, 1.2 s ease-in-out infinite alternate, closed); `gu-seam-pulse` (opacity .5 → 1, 1.2 s alternate, closed); in `opening`: `gu-door-left-open` / `gu-door-right-open` (rotateY 0 → -100deg / 100deg, 700 ms `cubic-bezier(.45,0,.2,1)`), `gu-plaque-out` (opacity → 0, 150 ms), `gu-panda-leave` (rotate(-8deg) at 20%, then translateY(12%) scale(.92) opacity 0 at 100%, 350 ms), `gu-seam-open` (scaleX 1 → 60 and opacity, 350 ms from 350 ms), `gu-glow-in` (opacity 0 → 1, 400 ms from 400 ms), `gu-opening-out` on the root (opacity 1 → 0, 300 ms from 700 ms, `forwards`); `fastOpen`: doors to ±100deg and `gu-opening-fast` on the root (opacity → 0), both 200 ms. Panda `height: min(36vh, 60vw)`, centered, `bottom: calc(6vh + env(safe-area-inset-bottom))`. Plaque centered on the seam at `top: 20%`, Merriweather 700, brass gradient background.

- [ ] **Step 5: Mount in `App.tsx` and fix `App.test.tsx`**

`App.test.tsx` now finds `Gú's Library` twice (toolbar and plaque, depending on timing): assert on the toolbar instead, `expect(document.querySelector('ion-title')).toHaveTextContent("Gú's Library")`.

- [ ] **Step 6: Run the tests, typecheck, lint**

Run: `npx vitest run src/opening src/App.test.tsx && npx tsc -b && npm run lint`
Expected: PASS; tsc clean; lint 0 errors, 10 warnings.

- [ ] **Step 7: Commit**

```bash
git add src/opening/OpeningDoors.tsx src/opening/opening.css src/opening/art.ts src/opening/OpeningDoors.test.tsx src/App.tsx src/App.test.tsx
git commit -m "feat(opening): bookcase doors overlay on cold start (placeholder art)"
```

### Task 6: Wire Home, share, crash and What's New

**Files:**
- Modify: `src/pages/HomePage.tsx` (`reload`), `src/import/ShareReceiver.tsx` (`check`), `src/components/CrashNotice.tsx`, `src/components/WhatsNewNotice.tsx`
- Test: `src/pages/HomePage.test.tsx`, `src/components/WhatsNewNotice.test.tsx` (existing); create `src/import/ShareReceiver.test.tsx`, `src/components/CrashNotice.test.tsx`

**Interfaces:**
- Consumes: Task 3 (`markHomeReady`, `skipOpening`, `whenOpeningDone`, `finishOpening`, `resetOpeningForTest`); in one test, Task 5's `OpeningDoors` and Task 4's `getOpeningEnabled` (mocked).

- [ ] **Step 1: Write the failing tests**

- `HomePage.test.tsx`: `vi.mock('../opening/homeReady', async (orig) => ({ ...(await orig()), markHomeReady: vi.fn() }))`; `'marks Home ready after the first load'`: `renderHome()` → `await waitFor(() => expect(markHomeReady).toHaveBeenCalled())`; `'marks Home ready with no kho chosen'`: `prefs.delete('saf_root_uri')` first, same assertion (a fresh install opens the doors onto "Chưa chọn folder kho").
- `ShareReceiver.test.tsx` (mock `../plugins/shareTarget`, `@capacitor/app` with a captured `resume` listener, `./ImportDestinationFlow` as `() => null`, `../opening/homeReady` with `skipOpening: vi.fn()`): `'cold share skips the doors'` (files `[{ uri: 'content://x', name: 'a.pdf' }]` → `skipOpening` called with `'share'`); `'nothing shared: doors untouched'` (empty → not called); `'share on a later resume calls skip again, harmlessly'` (fire the captured resume listener with files → called again; the machine ignores it after `done`, Task 2).
- `CrashNotice.test.tsx` (fakePreferences; `vi.mock('@ionic/react', async (orig) => ({ ...(await orig()), useIonAlert: () => [present] }))` with `present = vi.fn()`; real `../opening/homeReady` with `resetOpeningForTest()`): `'crash flag: skips the doors and waits for them before the alert'` (`prefs.set('viewer_crash', '1')` → render → `waitFor` `prefs.has('viewer_crash') === false`; `present` not called; `finishOpening()` → `waitFor(() => expect(present).toHaveBeenCalled())`); `'no flag: neither skip nor alert'`.
- `WhatsNewNotice.test.tsx`: in `beforeEach` add `resetOpeningForTest(); finishOpening();` so existing tests behave as today; new `'waits for the doors before opening'`: `resetOpeningForTest()` only, unseen notes → after `settle()` no heading; `finishOpening()` → `findByText(heading(V[0]))`. New `'switch off: the sheet still shows, at once'`: `resetOpeningForTest()` only, `vi.mock('../opening/openingPref', () => ({ getOpeningEnabled: async () => false }))`, render `<><OpeningDoors /><WhatsNewNotice /></>` → `findByText(heading(V[0]))` with no `finishOpening()` call from the test (the doors decide not to play and finish by themselves). The crash alert goes through the same `whenOpeningDone()` wait, so this one test covers both.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/pages/HomePage.test.tsx src/import/ShareReceiver.test.tsx src/components/CrashNotice.test.tsx src/components/WhatsNewNotice.test.tsx`
Expected: the four new behaviors FAIL; existing tests still PASS.

- [ ] **Step 3: Implement**

- `HomePage.reload`: `afterPaint(() => { perfColdReady(); markHomeReady(); })`.
- `ShareReceiver.check`: when `files.length > 0`, `skipOpening('share')` before `setBatch(files)`.
- `CrashNotice`: after reading the flag and removing it, `skipOpening('crash')`, `await whenOpeningDone()`, then `presentAlert(...)` unchanged.
- `WhatsNewNotice`: when `fresh.length > 0`, `await whenOpeningDone()` before `if (alive) { setNotes; setOpen(true) }`. Update its header comment in English (one line: shown after the opening doors).

- [ ] **Step 4: Run the whole suite, typecheck, lint**

Run: `npm test && npx tsc -b && npm run lint`
Expected: all PASS; tsc clean; lint 0 errors, 10 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/import/ShareReceiver.tsx src/import/ShareReceiver.test.tsx src/components/CrashNotice.tsx src/components/CrashNotice.test.tsx src/components/WhatsNewNotice.tsx src/components/WhatsNewNotice.test.tsx
git commit -m "feat(opening): Home opens the doors; share and crash skip them; What's New waits"
```

### Task 7: Cream splash and backgrounds (local, UBS1)

**Files:**
- Create: `android/app/src/main/res/values/colors.xml` (`gu_cream` = `#E9E5CD`), `assets/splash.png` (2732 × 2732, cream, `assets/icon-foreground.png` centered at about one third of the width)
- Modify: `android/app/src/main/res/values/styles.xml` (`AppTheme.NoActionBarLaunch`), `android/app/src/main/res/drawable*/splash.png` (regenerated), `capacitor.config.ts`, `index.html`

- [ ] **Step 1: Backgrounds**

`capacitor.config.ts`: `backgroundColor: '#E9E5CD'`. `index.html`: `<title>Gú's Library</title>`, `<body style="background:#E9E5CD">`.

- [ ] **Step 2: Splash theme**

In `AppTheme.NoActionBarLaunch` add `windowSplashScreenBackground` = `@color/gu_cream`, `windowSplashScreenAnimatedIcon` = `@mipmap/ic_launcher_foreground`, `postSplashScreenTheme` = `@style/AppTheme.NoActionBar`.

- [ ] **Step 3: Splash drawables**

Make `assets/splash.png` with Pillow in the throwaway venv, then `npx @capacitor/assets generate --android --splashBackgroundColor '#E9E5CD'`. Run `git status`: keep only `drawable*/splash.png`; `git checkout` any regenerated launcher icon (`mipmap-*`) so icons stay byte-identical.

- [ ] **Step 4: Build, install, record on UBS1**

Run: `npm run build && npx cap sync android && (cd android && ./gradlew assembleDebug)` (subshell, so the shell stays in the repo root) then install on UBS1 (uninstall first if a release build is on it: different signature). Record a cold start as in Task 1. Expected: cream from the first frame to Home, no white frame. If the system splash is still white or shows the old icon: add `SplashScreen.installSplashScreen(this)` (`androidx.core.splashscreen.SplashScreen`) at the top of `MainActivity.onCreate` before `super.onCreate`, rebuild, re-record.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/res capacitor.config.ts index.html assets/splash.png
git commit -m "feat(android): cream splash with the panda, cream WebView background"
```
(Add `android/app/src/main/java/com/gulibrary/app/MainActivity.java` if Step 4 needed it.)

### Task 8: e2e taps the doors away

**Files:**
- Modify: `e2e/tests/helpers.ts` (`toTab`, before the What's New block), `e2e/README.md` (one sentence, keep its wrapping)

- [ ] **Step 1: Implement**

In `toTab`, first thing: `const doors = screen.getByRole('button', { name: exact('Bỏ qua hiệu ứng mở cửa') });` if `await doors.waitFor({ timeout: 3000 })` succeeds, `await doors.tap()` (ignore a failure: the doors may have finished between the wait and the tap), then `await doors.waitFor({ state: 'hidden', timeout: 2000 })`. Comment: why (`app.open()` cold-starts every test; a tap on a tab would land on the overlay and only skip it). README: the doors appear at every `app.open()` and `toTab` taps them away.

- [ ] **Step 2: Typecheck the e2e package**

Run: `npm --prefix e2e run typecheck`
Expected: no errors. (The run on the device is in Task 10.)

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/helpers.ts e2e/README.md
git commit -m "test(e2e): tap the opening doors away before driving the tabs"
```

### Task 9: Real art through OpenRouter (local, needs huynh and Gú)

**Files:**
- Create: `scripts/gen-opening-art.mjs`, `scripts/opening-art/door.txt`, `scripts/opening-art/panda.txt`, `scripts/make-opening-assets.py`, `src/assets/opening-door.webp`, `src/assets/opening-panda.webp`
- Modify: `src/opening/art.ts`

**Interfaces:**
- `node scripts/gen-opening-art.mjs --model <id> --prompt <file> [--ref <png>] --n <k> --out <dir>`: POSTs to `https://openrouter.ai/api/v1/chat/completions` with `modalities: ['image', 'text']`, the prompt text and the reference as a `data:image/png;base64` `image_url`, and `usage: { include: true }`; writes each returned `choices[0].message.images[i].image_url.url` as `<out>/<name>-<model-slug>-<n>.png`; appends the reported cost to `<out>/spend.json` and refuses to start when the total is at least 3 USD. Exits non-zero with the API's error message (never the key) on failure.
- `python3 scripts/make-opening-assets.py --door <png> --panda <png>`: writes the two WebP files, prints dimensions and bytes, exits non-zero if the door is over 120 KB or the panda over 80 KB.

- [ ] **Step 1: Prompts**

`scripts/opening-art/door.txt` and `panda.txt`: the drafts of spec §6.2, verbatim.

- [ ] **Step 2: Write `gen-opening-art.mjs` and try one call**

Out dir: `~/Dev/art/gu-library/opening/` (outside the repo). One door image on `google/gemini-nano-banana-2.1` with `--n 1`. Expected: one PNG and a `spend.json` with a cost. If the response shape differs, adapt the parser to what OpenRouter returns and note it in the script header.

- [ ] **Step 3: Model trial**

Door `--n 2` and panda (`--ref resources/source-1024.png`) `--n 2` on `google/gemini-nano-banana-2.1` and on `google/gemini-3-pro-image`. Make one contact sheet PNG and send it to huynh (`SendUserFile`); huynh picks the model.

- [ ] **Step 4: Rounds with the chosen model until huynh and Gú pick one door and one panda**

`--n 4` per round; report spend after each round; stop and ask huynh before any call that would pass 3 USD in total. Reject doors that are not straight-on.

- [ ] **Step 5: Write `make-opening-assets.py` and run it**

Door: tight crop to the door, cover-crop to 600 × 1600, WebP quality 82. Panda: key the background by color distance from the four sampled corners, erode 1 px, feather the edge, crop to alpha, scale to about 600 px tall, WebP with alpha. Header docstring like `make-press-sprites.py` (one-off, throwaway venv, source art not committed, prompts in the ops doc).

Run it; expected: both files within budget.

- [ ] **Step 6: Swap the art**

`art.ts`: `DOOR_SRC` and `PANDA_SRC` import the two WebP files; drop the placeholder import. Make a preview PNG (door, mirrored door, panda on top, at 720 × 1600 and at 720 × 720) and send it to huynh; look for a visible seam and a halo around the panda.

- [ ] **Step 7: Tests and commit**

Run: `npm test && npx tsc -b && npm run lint && npm run build`
Expected: green; lint 0 errors, 10 warnings.

```bash
git add scripts/gen-opening-art.mjs scripts/opening-art scripts/make-opening-assets.py src/assets/opening-door.webp src/assets/opening-panda.webp src/opening/art.ts
git commit -m "feat(opening): real door and panda art (OpenRouter), cut by script"
```

### Task 10: Verify and measure on the devices (local)

**Files:**
- Modify: `Docs/perf/2026-10-24-opening-doors.md`
- Maybe create (contingency): `android/app/src/main/java/com/gulibrary/app/MotionPlugin.java`, `src/plugins/motion.ts`; modify `MainActivity.java` (register), `OpeningDoors.tsx`

- [ ] **Step 1: Build the acceptance APK**

Release build per the existing flow (back up any APK in `android/app/build/outputs/apk/release/` first). Install on UBS1 and dGen1.

- [ ] **Step 2: Checklist (spec §9) on UBS1 and dGen1, write each result in the perf note**

Doors close, open, Home at the right beat; no distortion portrait (UBS1) or square (dGen1); no white frame. Tap skip in cover, closed and opening; back skips and does not exit. Background then resume: no doors. Share a file from another app while the app is stopped (UBS1): no doors, destination sheet shows. Switch off: no doors. "Có gì mới" shows after the doors. dGen1: only the first open after install is a cold start (no force-stop).

- [ ] **Step 3: Reduced motion**

On UBS1: `adb shell settings put global animator_duration_scale 0` (also `transition_animation_scale 0`, `window_animation_scale 0`), cold start. Expected: no doors. If doors still play, the WebView does not map the setting: add `MotionPlugin.reducedMotion(): Promise<{ reduced: boolean }>` reading `Settings.Global.ANIMATOR_DURATION_SCALE == 0f`, use it in `OpeningDoors` alongside `matchMedia` (either one true = reduced), with a test in `OpeningDoors.test.tsx` (`'native reduced motion: no doors'`). Restore the three settings to 1 afterwards.

- [ ] **Step 4: A/B against 1.43.1, 3 runs each, UBS1**

Cold start: record `screenrecord` frame times as in Task 1 (doors shown, opening start, Home interactive); "Janky frames" from `dumpsys gfxinfo com.gulibrary.app` read 5 s after a force-stopped launch (a fresh process counts from its own start, so no `reset` is needed). PSS on Home after the doors left the DOM (main process plus the app's `sandboxed_process0` renderer). APK size. Write the table and the medians. Do not claim 60 FPS unless the numbers show it.

- [ ] **Step 5: e2e**

Run: `npm run e2e` (UBS1, read `e2e/README.md` first).
Expected: 10/10.

- [ ] **Step 6: Commit**

```bash
git add Docs/perf/2026-10-24-opening-doors.md
git commit -m "docs(perf): opening doors verified on UBS1 and dGen1, A/B against 1.43.1"
```
(Plus the contingency files when Step 3 needed them.)

### Task 11: Release 1.44.0 (local)

Follow "Phát hành" in `CLAUDE.md`; only what is specific to this beat is listed.

- [ ] **Step 1:** Branch `release/1.44.0`; bump `package.json` to `1.44.0` in the same commit as a new entry in `src/whatsNew/notes.ts` written for "Pé": the bookcase doors, a tap skips them, and where to turn them off (Cài đặt, "Hiệu ứng mở cửa"). Huynh approves the wording before the merge.
- [ ] **Step 2:** `CHANGELOG.md`; ops doc §8.1 with the Task 10 results and, under the release, the two prompts, the model, the date and the spend.
- [ ] **Step 3:** `Docs/claude/lessons.md`: the decisions (bookcase doors onto the real Home, panda judge, OpenRouter for art, "the image model does not hold a set: generate few pieces, derive the rest in code") and any device trap met in Tasks 7 and 10 (splash attributes, reduced motion in WebView).
- [ ] **Step 4:** Merge `--no-ff` into `main`, light tag `v1.44.0`, push, update the App status line in the ops doc, `scripts/sync-ops-doc.sh` then `scripts/sync-ops-doc.sh --publish`. Each push needs huynh's go-ahead.
