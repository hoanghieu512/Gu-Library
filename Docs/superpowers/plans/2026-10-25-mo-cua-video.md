# Opening Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a cold start, a 4.2 s pre-rendered clip of the panda judge walking up, pushing the library doors open and waving plays in a native layer above the WebView, then fades onto Home; it replaces the CSS bookcase doors.

**Architecture:** Pure Java decision (`OpeningGate`) and state machine (`OpeningFlow`), unit-tested with JUnit; an Android view layer (`OpeningOverlay`: `TextureView` + `MediaPlayer` + first-frame `ImageView`) attached by `MainActivity`; a Capacitor plugin (`OpeningPlugin` / `src/plugins/opening.ts`) through which JS reports Home ready and waits for the layer to leave. JS keeps `markHomeReady` / `whenOpeningDone` and drops the CSS overlay.

**Tech Stack:** Android (Java, AppCompat, `MediaPlayer`, `TextureView`), Capacitor 8 plugin API, JUnit 4, TypeScript, vitest, ffmpeg (asset script).

**Spec:** `Docs/superpowers/specs/2026-10-25-mo-cua-video-design.md` (and, for what stays, `Docs/superpowers/specs/2026-10-24-mo-cua-tu-sach-design.md`)

## Global Constraints

- No em dash (U+2014) anywhere. Code, comments, commit messages in English; UI text Vietnamese.
- No new dependency in Gradle or npm (no ExoPlayer); ffmpeg is a dev-machine tool for the asset script only.
- Exact values: clip cut 0.15 to 1.6 s at 1.7x, 1.6 to 4.6 s at 1.4x, 4.6 s to end at 1.1x; 30 fps; H.264 main, CRF 23, `+faststart`, no audio; outputs `android/app/src/main/res/raw/opening.mp4` and `android/app/src/main/res/drawable-nodpi/opening_first.webp`. `HOLD_MAX_MS = 2000`, `FADE_MS = 300`, `FAST_FADE_MS = 200`, cap = video duration + `CAP_SLACK_MS = 3000`.
- Preferences: `SharedPreferences` file `CapacitorStorage`, keys `opening_doors` (value `"off"` = switch off) and `viewer_crash` (value `"1"`).
- Accessibility label of the layer: `Bỏ qua hiệu ứng mở cửa`, announced as a button.
- Plugin name `Opening`, methods `homeReady()` and `whenDone()`, both `Promise<void>`; the web implementation resolves both at once.
- `npm test`, `npx tsc -b`, `npm run lint` (0 errors, exactly 10 warnings), `npm run build`, `cd android && ./gradlew testReleaseUnitTest` (then absolute paths) all green.
- Device builds: signed release, `adb install -r` over the installed build (never uninstall: it wipes the QA kho grant). dGen1 is never force-stopped.
- Until the release task, do not touch `package.json` version, `src/whatsNew/notes.ts`, `CHANGELOG.md`, the ops doc.

## Review Focus

- Home key pressed while the clip plays, then the app reopened: the layer is gone and the clip does not replay (`PAUSED` → `DONE`): test in Task 3, device check in Task 7.
- A file shared to the app while the clip plays: the clip is skipped and the destination sheet shows: test in Task 3 (`SKIP` from `PLAYING`), device check in Task 7.
- The clip fails to prepare or play: the layer leaves at once and `whenDone()` resolves (`ERROR` → `DONE`): test in Task 3.
- Home never reports ready (broken kho): the last frame holds at most 2 s, then fades (`HOLD_TIMEOUT`): test in Task 3.
- `whenOpeningDone()` when the layer never played (switch off, share, crash) or the plugin call fails: resolves at once so What's New and the crash alert still show: tests in Task 5.

---

### Task 1: The clip and its first frame

**Files:**
- Create: `scripts/make-opening-video.sh`, `android/app/src/main/res/raw/opening.mp4`, `android/app/src/main/res/drawable-nodpi/opening_first.webp`

- [ ] **Step 1: Write `scripts/make-opening-video.sh <source.mp4>`**

Bash, `set -euo pipefail`, needs ffmpeg. One ffmpeg call with the `trim`/`setpts`/`concat` cut from Global Constraints, `fps=30,format=yuv420p`, `-c:v libx264 -profile:v main -crf 23 -preset slow -movflags +faststart -an`; a second call writes the first frame of the result as WebP (`-frames:v 1 -c:v libwebp -quality 85`). Header comment: source (Higgsfield Genjutsu, 696 x 1320, approved 25/10), source not committed, prompt and references in the ops doc §8.

- [ ] **Step 2: Run it on the approved clip**

Run: `scripts/make-opening-video.sh <scratchpad>/hf2/v.mp4`
Expected: `ffprobe` on `opening.mp4` shows 696 x 1320, about 4.2 s, no audio stream, under 1.3 MB; `opening_first.webp` is 696 x 1320 and shows the closed doors.

- [ ] **Step 3: Commit**

```bash
git add scripts/make-opening-video.sh android/app/src/main/res/raw/opening.mp4 android/app/src/main/res/drawable-nodpi/opening_first.webp
git commit -m "feat(opening): the 4.2 s panda clip and its first frame"
```

### Task 2: OpeningGate

**Files:**
- Create: `android/app/src/main/java/com/gulibrary/app/OpeningGate.java`
- Test: `android/app/src/test/java/com/gulibrary/app/OpeningGateTest.java`

**Interfaces:**
- Produces: `final class OpeningGate { static final String SWITCH_KEY = "opening_doors"; static final String CRASH_KEY = "viewer_crash"; static boolean shouldPlay(boolean coldStart, String intentAction, String switchValue, String crashFlag, float animatorScale) }`

- [ ] **Step 1: Write the failing tests** (JUnit 4, style of `SafNamesTest`)

`playsOnAPlainColdStart` (`true, "android.intent.action.MAIN", null, null, 1f` → true); `notWhenRecreatedOrRestored` (`coldStart=false` → false); `notWhenOpenedToReceiveAShare` (`"android.intent.action.SEND"` and `"android.intent.action.SEND_MULTIPLE"` → false); `notWhenTheSwitchIsOff` (`"off"` → false; any other value or null → true); `notAfterARendererCrash` (`"1"` → false); `notWhenAnimationsAreRemoved` (`0f` → false, `0.5f` → true); `aNullActionStillPlays` (`null` action → true).

- [ ] **Step 2: Run to see them fail**

Run: `cd android && ./gradlew testReleaseUnitTest --tests '*OpeningGateTest*'`
Expected: compilation failure, `OpeningGate` missing.

- [ ] **Step 3: Implement `OpeningGate.shouldPlay`**

Compare the action with `Intent.ACTION_SEND` / `ACTION_SEND_MULTIPLE` (compile-time constants, fine in JVM tests).

- [ ] **Step 4: Run to see them pass**

Run: `cd android && ./gradlew testReleaseUnitTest --tests '*OpeningGateTest*'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/gulibrary/app/OpeningGate.java android/app/src/test/java/com/gulibrary/app/OpeningGateTest.java
git commit -m "feat(opening): decide natively when the opening clip plays"
```

### Task 3: OpeningFlow

**Files:**
- Create: `android/app/src/main/java/com/gulibrary/app/OpeningFlow.java`
- Test: `android/app/src/test/java/com/gulibrary/app/OpeningFlowTest.java`

**Interfaces:**
- Produces:
  ```java
  final class OpeningFlow {
    enum State { POSTER, PLAYING, HOLDING, FADING, DONE }
    enum Event { RENDERING_STARTED, VIDEO_ENDED, HOME_READY, SKIP, HOLD_TIMEOUT, CAP_TIMEOUT, ERROR, PAUSED, FADE_ENDED }
    static final long HOLD_MAX_MS = 2000, FADE_MS = 300, FAST_FADE_MS = 200, CAP_SLACK_MS = 3000;
    State state();
    boolean fastFade();      // meaningful in FADING
    boolean on(Event e);     // true when the state changed
  }
  ```

- [ ] **Step 1: Write the failing tests** (helper `flow(Event... es)` returning a fresh flow after the events)

- `startsOnThePoster`: state `POSTER`.
- `renderingStartedPlays`: `RENDERING_STARTED` → `PLAYING`.
- `videoEndedHoldsUntilHomeIsReady`: `RENDERING_STARTED, VIDEO_ENDED` → `HOLDING`; then `HOME_READY` → `FADING`, `fastFade()` false.
- `homeReadyEarlyFadesRightAtTheEnd`: `HOME_READY, RENDERING_STARTED, VIDEO_ENDED` → `FADING`, not fast.
- `holdTimesOut`: `RENDERING_STARTED, VIDEO_ENDED, HOLD_TIMEOUT` → `FADING`, not fast.
- `skipFadesFastFromPosterPlayingAndHolding`: from each of `POSTER`, `PLAYING`, `HOLDING`, `SKIP` → `FADING` with `fastFade()` true.
- `skipDuringAFadeIsIgnored`: `RENDERING_STARTED, VIDEO_ENDED, HOME_READY, SKIP` stays `FADING` and not fast; `on(SKIP)` returns false.
- `errorEndsAtOnce`: `ERROR` from `POSTER` and from `PLAYING` → `DONE`.
- `pauseEndsAtOnce`: `PAUSED` from `PLAYING` and from `FADING` → `DONE`.
- `capFadesWhateverHappens`: `CAP_TIMEOUT` from `POSTER` → `FADING`, not fast.
- `fadeEndedFinishes`: `... FADING` + `FADE_ENDED` → `DONE`.
- `doneIgnoresEverything`: after `ERROR`, every event leaves `DONE` and `on` returns false.
- `videoEndedBeforeRenderingStartedStillHolds`: `VIDEO_ENDED` from `POSTER` → `HOLDING` (a very short decode).

- [ ] **Step 2: Run to see them fail**

Run: `cd android && ./gradlew testReleaseUnitTest --tests '*OpeningFlowTest*'`
Expected: compilation failure.

- [ ] **Step 3: Implement `OpeningFlow`** (rules of spec §5.2; `homeReady` flag kept whatever the state)

- [ ] **Step 4: Run to see them pass**

Run: `cd android && ./gradlew testReleaseUnitTest`
Expected: all JUnit tests PASS (OpeningGate, OpeningFlow, SafNames).

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/gulibrary/app/OpeningFlow.java android/app/src/test/java/com/gulibrary/app/OpeningFlowTest.java
git commit -m "feat(opening): state machine for the opening clip"
```

### Task 4: The native layer, the plugin, MainActivity

**Files:**
- Create: `android/app/src/main/java/com/gulibrary/app/OpeningOverlay.java`, `android/app/src/main/java/com/gulibrary/app/OpeningPlugin.java`, `src/plugins/opening.ts`, `src/plugins/opening.test.ts`
- Modify: `android/app/src/main/java/com/gulibrary/app/MainActivity.java`

**Interfaces:**
- Consumes: `OpeningGate.shouldPlay`, `OpeningFlow` (Tasks 2, 3).
- Produces:
  - Java: `final class OpeningOverlay { static OpeningOverlay attach(AppCompatActivity a); void homeReady(); void skip(); void onPause(); void whenDone(Runnable r); boolean isDone(); }` (all on the main thread); `MainActivity.opening()` returns the overlay or null.
  - JS: `export interface OpeningPlugin { homeReady(): Promise<void>; whenDone(): Promise<void> }`, `export const Opening = registerPlugin<OpeningPlugin>('Opening', { web: { homeReady: async () => {}, whenDone: async () => {} } })`.

- [ ] **Step 1: Failing test for the web implementation** (`src/plugins/opening.test.ts`)

`'web: homeReady and whenDone resolve at once'`: both `await` to `undefined` in jsdom.

- [ ] **Step 2: Run it, see it fail, write `src/plugins/opening.ts`, see it pass**

Run: `npx vitest run src/plugins/opening.test.ts`
Expected: FAIL (module missing), then PASS.

- [ ] **Step 3: Write `OpeningOverlay`**

- Root `FrameLayout`, `MATCH_PARENT`, added with `activity.addContentView`; holds a `TextureView` and above it an `ImageView` (`R.drawable.opening_first`, `centerCrop`). Root is clickable (click → `skip()`), `contentDescription` from Global Constraints, `AccessibilityDelegate` reporting class name `android.widget.Button`.
- `MediaPlayer` from `R.raw.opening` (`setDataSource` on the raw fd), volume 0, `prepareAsync` once the `SurfaceTexture` is available; on prepared, set the centre-crop matrix on the `TextureView` (`scale = max(viewW / videoW, viewH / videoH)` around the centre) and `start()`; `MEDIA_INFO_VIDEO_RENDERING_START` → `RENDERING_STARTED` (hide the poster); completion → `VIDEO_ENDED` (the `TextureView` keeps the last frame); error → `ERROR`.
- Timers on a main-thread `Handler`: hold (`HOLD_MAX_MS`) started on entering `HOLDING`; cap (`duration + CAP_SLACK_MS`, before prepare use a 4200 ms estimate) started at attach.
- Entering `FADING`: animate root alpha to 0 over `FADE_MS` or `FAST_FADE_MS`, end → `FADE_ENDED`. Entering `DONE`: remove the root from its parent, `release()` the player, remove handler callbacks, disable the back callback, run and clear the `whenDone` runnables.
- `OnBackPressedCallback` (enabled while not done) registered on the activity's dispatcher in `attach` → `skip()`.

- [ ] **Step 4: Write `OpeningPlugin`** (`@CapacitorPlugin(name = "Opening")`)

`homeReady(call)`: on the main thread, `MainActivity.opening()?.homeReady()`, then `call.resolve()`. `whenDone(call)`: on the main thread, resolve at once if the overlay is null or done, otherwise `overlay.whenDone(call::resolve)` (hold the call; one resolve, no keep-alive needed).

- [ ] **Step 5: Wire `MainActivity`**

`registerPlugin(OpeningPlugin.class)` with the others. After `super.onCreate`: read `CapacitorStorage` (`OpeningGate.SWITCH_KEY`, `OpeningGate.CRASH_KEY`), `Settings.Global.ANIMATOR_DURATION_SCALE` (default 1), `getIntent().getAction()`, `coldStart = savedInstanceState == null`; if `OpeningGate.shouldPlay(...)`, `opening = OpeningOverlay.attach(this)`. `onNewIntent`: when the action is `SEND`/`SEND_MULTIPLE` and the overlay is live, `skip()`. `onPause`: `opening.onPause()` if live. `opening()` accessor.

- [ ] **Step 6: Build and JUnit**

Run: `npm run build && npx cap sync android && (cd android && ./gradlew testReleaseUnitTest assembleRelease -q)`
Expected: BUILD SUCCESSFUL, JUnit green.

- [ ] **Step 7: Commit**

```bash
git add android/app/src/main/java/com/gulibrary/app src/plugins/opening.ts src/plugins/opening.test.ts
git commit -m "feat(opening): native layer plays the clip above the WebView"
```

### Task 5: JS on the plugin, CSS doors removed

**Files:**
- Modify: `src/opening/homeReady.ts`, `src/opening/homeReady.test.ts`, `src/import/ShareReceiver.tsx`, `src/import/ShareReceiver.test.tsx`, `src/components/CrashNotice.tsx`, `src/components/CrashNotice.test.tsx`, `src/components/WhatsNewNotice.test.tsx`, `src/App.tsx`
- Delete: `src/opening/OpeningDoors.tsx`, `src/opening/OpeningDoors.test.tsx`, `src/opening/opening.css`, `src/opening/art.ts`, `src/opening/openingMachine.ts`, `src/opening/openingMachine.test.ts`, `src/opening/smoothFrames.ts`, `src/opening/smoothFrames.test.ts`, `src/assets/opening-door.webp`, `src/assets/opening-panda.webp`, `scripts/make-opening-assets.py`

**Interfaces:**
- Consumes: `Opening` from `src/plugins/opening.ts` (Task 4).
- Produces: `markHomeReady(): void`, `whenOpeningDone(): Promise<void>`, `resetOpeningForTest(): void` (same names as today; `skipOpening`, `subscribeOpening`, `finishOpening` removed).

- [ ] **Step 1: Rewrite `homeReady.test.ts` against a mocked plugin** (`vi.mock('../plugins/opening', () => ({ Opening: { homeReady: vi.fn(), whenDone: vi.fn() } }))`)

`'markHomeReady tells native once'` (two calls → `Opening.homeReady` called once); `'a failing homeReady is swallowed'` (rejects → no unhandled rejection, no throw); `'whenOpeningDone waits for native'` (deferred `whenDone`: pending until resolved); `'whenOpeningDone asks native once per load'` (two calls → one `Opening.whenDone` call, same promise); `'a failing whenDone counts as done'` (rejects → resolves); `'reset forgets both'`.

- [ ] **Step 2: Update the dependants' tests**

`CrashNotice.test.tsx`: mock the plugin with a deferred `whenDone`; the crash flag case presents the alert only after `whenDone` resolves; no skip assertions. `ShareReceiver.test.tsx`: drop the skip tests (keep none, or one asserting a share still reaches the sheet if the file had such a test; it did not). `WhatsNewNotice.test.tsx`: mock the plugin (`whenDone` resolved by default, `resetOpeningForTest()` in `beforeEach`); keep `'waits for the doors before opening'` with a deferred `whenDone`; delete the `'switch off'` test (the doors component is gone; native decides).

- [ ] **Step 3: Run them, see the new cases fail**

Run: `npx vitest run src/opening src/components/CrashNotice.test.tsx src/components/WhatsNewNotice.test.tsx src/import/ShareReceiver.test.tsx`
Expected: failures in `homeReady.test.ts` (and the dependants) against the old module.

- [ ] **Step 4: Implement**

`homeReady.ts` per spec §5.5; remove the `skipOpening` calls from `ShareReceiver` and `CrashNotice`; remove `<OpeningDoors />` and its import from `App.tsx`; delete the files listed above.

- [ ] **Step 5: Whole suite, typecheck, lint, build**

Run: `npm test && npx tsc -b && npm run lint && npm run build`
Expected: green; lint 0 errors, 10 warnings.

- [ ] **Step 6: Commit**

```bash
git add -A src scripts
git commit -m "feat(opening): JS waits on the native clip; CSS doors removed"
```

### Task 6: e2e wording

**Files:**
- Modify: `e2e/tests/helpers.ts` (comment above the doors wait), `e2e/README.md` (the doors bullet, keep its wrapping)

- [ ] **Step 1:** Comment: the opening clip is a native layer above the WebView, up to about 6.5 s (4.2 s clip + 2 s hold + 0.3 s fade), still found by its label; keep the 8 s timeout. README bullet the same.
- [ ] **Step 2:** Run: `npm --prefix e2e run typecheck`. Expected: no errors.
- [ ] **Step 3:** Commit `test(e2e): the opening is a native clip now`.

### Task 7: Device checks and numbers (local)

**Files:**
- Modify: `Docs/perf/2026-10-24-opening-doors.md` (new section "Video native")

- [ ] **Step 1:** Release build, `adb install -r` on UBS1. Launcher-tap cold start recorded 3 times (same method and scripts as the CSS doors A/B): time to the final Home screen vs 1.43.1's 4.45 s; first app frame is the poster (no black frame); the clip plays without a freeze.
- [ ] **Step 2:** Tap and back at the start, mid-clip and during the hold; Home key mid-clip then reopen; cold share (no clip, sheet shows); share mid-clip (`am start SEND` about 1 s after launch: clip skipped, sheet shows); switch off (no clip; turn it back on). Reduced motion only with huynh's go-ahead (system setting).
- [ ] **Step 3:** dGen1 if connected: first open after install, by `monkey`, no force-stop; centre crop keeps the doors and the panda's face.
- [ ] **Step 4:** `npm run e2e` → 10/10; PSS 13 s after launch vs 1.43.1; APK size.
- [ ] **Step 5:** Write the results; commit `docs(perf): opening clip on UBS1, A/B against 1.43.1`.

### Task 8: Release 1.44.0 (local, needs huynh)

Same as Task 11 of `Docs/superpowers/plans/2026-10-24-mo-cua-tu-sach.md`, with the notes rewritten for the clip (panda opens the library doors, a tap skips it, where to switch it off, no more white flash), ops doc §8 recording the clip's source (Genjutsu, references P1, C4, library image, prompt, reference motion filmed by huynh, date), and `lessons.md` gaining the native-layer decision and the WebView freeze finding. Every push needs huynh's go-ahead.
