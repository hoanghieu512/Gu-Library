# Android Back Navigation (v0.5.1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Android hardware/gesture back navigates one step up (folder → parent folder → home; viewer → folder) instead of exiting the app; at the home root it asks for a second press before exiting.

**Architecture:** Extract a pure decision function `decideBackAction(canGoBack, exitArmed) → action` that is unit-tested. A thin `useAndroidBackButton` hook subscribes to Ionic's `ionBackButton` event at the lowest priority (so Ionic's own overlay handlers consume the press first when a modal/sheet is open), reads `useIonRouter().canGoBack()`, and dispatches the action. The hook is mounted once via a render-null `BackButtonHandler` component placed inside `IonReactRouter`.

**Tech Stack:** Ionic React 8, `@ionic/react-router` (react-router v5), Capacitor 8, `@capacitor/app` (to be installed), React 19, Vitest.

---

## Context & root-cause note (read before starting)

The symptom: Android edge-swipe / hardware back **exits the app** from inside a folder or the PDF viewer, instead of going back one step. The on-screen arrow (`IonBackButton`) works, so the navigation stack is NOT empty — the problem is the hardware/gesture back press not being routed to a stack pop.

Per Ionic docs, Ionic React *should* auto-pop the stack on hardware back via `IonRouterOutlet`. There are several documented failure modes, and we cannot pin the exact one from source alone. The two live suspects:

1. **React 18+/19 `createRoot` + `@ionic/react-router` on a DEBUG build** — known issue ionic-team/ionic-framework#26599 where hardware back does not fire at all on debug builds but works on release builds. This project has been tested on debug builds throughout M1→M5, so this is the prime suspect.
2. **Tabs + detail routes outside any tab** — `/folder/:uri` and `/viewer/:uri` live in the `IonTabs` outlet but belong to no tab, which can confuse Ionic's per-tab back-stack handling.

Adding our own explicit `ionBackButton` handler (this plan) fixes case 2 directly and is the correct UX layer regardless. For case 1, the handler is verified on debug in Task 5; **if the event never fires even with the explicit handler (Task 5 fails), Task 6 confirms the debug-build bug by testing a release build.** Either way we end with correct, intentional back behavior and a documented finding.

This feature's core logic is unit-tested; the Capacitor wiring is **manually verified on a real device** because the hardware back button cannot be simulated in jsdom (same class of constraint as the M5 DOMMatrix issue).

---

## File Structure
- `src/nav/decideBackAction.ts` — pure decision function (new). One responsibility: map state → action.
- `src/nav/decideBackAction.test.ts` — unit tests for the pure function (new).
- `src/nav/useAndroidBackButton.ts` — hook wiring the `ionBackButton` event to the decision + side effects (new).
- `src/App.tsx` — mount the hook via a `BackButtonHandler` component inside `IonReactRouter` (modify).
- `package.json` — add `@capacitor/app` dependency; bump version to `0.5.1` (modify).
- `CHANGELOG.md` — add the v0.5.1 entry (modify).

---

### Task 1: Install `@capacitor/app`
**Files:**
- Modify: `package.json` (dependencies)

- [ ] **Step 1: Install the plugin (must match Capacitor 8.x already in the project)**
Run:
```bash
npm install @capacitor/app@^8.0.0
```
Expected: `@capacitor/app` appears under `dependencies` in `package.json` at a `^8.x` version aligned with the existing `@capacitor/core@^8.4.0`.

- [ ] **Step 2: Sync the native Android project**
Run:
```bash
npx cap sync android
```
Expected: output includes `✔ Copying web assets` and `✔ Updating Android plugins`, and lists `@capacitor/app` among the found Capacitor plugins.

- [ ] **Step 3: Commit**
```bash
git add package.json package-lock.json android
git commit -m "build: add @capacitor/app for hardware back handling"
```

---

### Task 2: Pure decision function `decideBackAction`
**Files:**
- Create: `src/nav/decideBackAction.ts`
- Test: `src/nav/decideBackAction.test.ts`

- [ ] **Step 1: Write the failing test**
Create `src/nav/decideBackAction.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { decideBackAction } from './decideBackAction';

describe('decideBackAction', () => {
  it('goes back when history has a previous entry', () => {
    expect(decideBackAction({ canGoBack: true, exitArmed: false })).toBe('go-back');
  });
  it('go-back takes precedence over exit arming', () => {
    expect(decideBackAction({ canGoBack: true, exitArmed: true })).toBe('go-back');
  });
  it('asks for confirmation at the root on the first press', () => {
    expect(decideBackAction({ canGoBack: false, exitArmed: false })).toBe('confirm-exit');
  });
  it('exits at the root when already armed', () => {
    expect(decideBackAction({ canGoBack: false, exitArmed: true })).toBe('exit');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**
Run:
```bash
npx vitest run src/nav/decideBackAction.test.ts
```
Expected: FAIL — cannot resolve module `./decideBackAction` (file does not exist yet).

- [ ] **Step 3: Write the minimal implementation**
Create `src/nav/decideBackAction.ts`:
```ts
export type BackAction = 'go-back' | 'confirm-exit' | 'exit';

export interface BackState {
  /** True when the router has a previous entry to pop to. */
  canGoBack: boolean;
  /** True when a recent back press has armed the exit-confirmation window. */
  exitArmed: boolean;
}

/**
 * Decides what a single Android back press should do.
 * Overlay handling is intentionally NOT here: Ionic's own overlay handlers run
 * at a higher priority and consume the press before this logic is reached.
 */
export function decideBackAction(state: BackState): BackAction {
  if (state.canGoBack) return 'go-back';
  if (state.exitArmed) return 'exit';
  return 'confirm-exit';
}
```

- [ ] **Step 4: Run the test to verify it passes**
Run:
```bash
npx vitest run src/nav/decideBackAction.test.ts
```
Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**
```bash
git add src/nav/decideBackAction.ts src/nav/decideBackAction.test.ts
git commit -m "feat: add decideBackAction back-navigation decision logic"
```

---

### Task 3: `useAndroidBackButton` hook
**Files:**
- Create: `src/nav/useAndroidBackButton.ts`

> No unit test here: this hook only wires the `ionBackButton` DOM event, `useIonRouter`, `useIonToast`, and `@capacitor/app` together — all of which require a real Android runtime. It is covered by the manual matrix in Task 5. The decision logic it depends on is already tested in Task 2.

- [ ] **Step 1: Write the hook**
Create `src/nav/useAndroidBackButton.ts`:
```ts
import { useEffect, useRef } from 'react';
import { useIonRouter, useIonToast } from '@ionic/react';
import { App } from '@capacitor/app';
import { decideBackAction } from './decideBackAction';

const EXIT_CONFIRM_WINDOW_MS = 2000;

/** Detail shape of the Ionic `ionBackButton` CustomEvent. */
interface IonBackButtonDetail {
  register: (priority: number, handler: (processNextHandler: () => void) => void) => void;
}

/**
 * Wires the Android hardware/gesture back button to one-step-up navigation.
 * Registers at priority -1 so Ionic's overlay handlers (priority >= 100) run
 * first and consume the press when a modal/action-sheet/alert is open.
 */
export function useAndroidBackButton(): void {
  const router = useIonRouter();
  const [presentToast] = useIonToast();
  const exitArmedRef = useRef(false);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const onIonBackButton = (ev: Event): void => {
      const detail = (ev as CustomEvent<IonBackButtonDetail>).detail;
      detail.register(-1, async () => {
        const action = decideBackAction({
          canGoBack: router.canGoBack(),
          exitArmed: exitArmedRef.current,
        });
        if (action === 'go-back') {
          router.goBack();
          return;
        }
        if (action === 'exit') {
          await App.exitApp();
          return;
        }
        // action === 'confirm-exit'
        exitArmedRef.current = true;
        if (armTimerRef.current) clearTimeout(armTimerRef.current);
        armTimerRef.current = setTimeout(() => {
          exitArmedRef.current = false;
        }, EXIT_CONFIRM_WINDOW_MS);
        await presentToast({
          message: 'Nhấn back lần nữa để thoát',
          duration: EXIT_CONFIRM_WINDOW_MS,
        });
      });
    };
    document.addEventListener('ionBackButton', onIonBackButton);
    return () => {
      document.removeEventListener('ionBackButton', onIonBackButton);
      if (armTimerRef.current) clearTimeout(armTimerRef.current);
    };
  }, [router, presentToast]);
}
```

- [ ] **Step 2: Type-check / lint to confirm it compiles**
Run:
```bash
npx tsc --noEmit
```
Expected: no errors referencing `src/nav/useAndroidBackButton.ts`.

- [ ] **Step 3: Commit**
```bash
git add src/nav/useAndroidBackButton.ts
git commit -m "feat: add useAndroidBackButton hook (ionBackButton + useIonRouter)"
```

---

### Task 4: Mount the hook in `App.tsx`
**Files:**
- Modify: `src/App.tsx`

> `useIonRouter` only works inside `IonReactRouter`'s context, so the hook is mounted via a render-null component placed as the first child of `IonReactRouter`, above `IonTabs`.

- [ ] **Step 1: Add the import**
In `src/App.tsx`, add to the import block near the top (after the existing page imports):
```ts
import { useAndroidBackButton } from './nav/useAndroidBackButton';
```

- [ ] **Step 2: Add the `BackButtonHandler` component**
In `src/App.tsx`, add this component definition directly above `export default function App()`:
```tsx
function BackButtonHandler() {
  useAndroidBackButton();
  return null;
}
```

- [ ] **Step 3: Render it inside `IonReactRouter`**
In `src/App.tsx`, change the opening of the router from:
```tsx
      <IonReactRouter>
        <IonTabs>
```
to:
```tsx
      <IonReactRouter>
        <BackButtonHandler />
        <IonTabs>
```

- [ ] **Step 4: Run the existing test suite to confirm nothing regressed**
Run:
```bash
npx vitest run
```
Expected: PASS — all existing unit tests (39 prior + 4 new from Task 2 = 43) green. The lazy-loaded viewer smoke test stays green because `App.tsx` still does not eagerly import the viewer, and `useAndroidBackButton` only attaches a DOM listener (no DOMMatrix usage).

- [ ] **Step 5: Commit**
```bash
git add src/App.tsx
git commit -m "feat: mount BackButtonHandler in App router"
```

---

> **KẾT QUẢ (2026-06-20, v0.5.1):** ĐẠT trên SM-S908E (debug build). Handler chạy tốt trên debug → KHÔNG dính bug #26599, **bỏ qua Task 6**. Một fix ngoài plan: handler ban đầu đăng ký priority -1 (dưới IonTabs 0) gây **double-pop** → đã đổi lên **priority 50** (trên IonTabs, dưới overlay/menu). Ma trận back pass hết: C→B→A→Home (mỗi back 1 cấp), viewer→folder, Home→toast→thoát.

### Task 5: Manual verification on a real Android device (DEBUG build)
**Files:** none (verification only)

- [ ] **Step 1: Build, sync, and run on device**
Run:
```bash
npm run build && npx cap sync android && npx cap run android
```
Expected: app launches on the connected device/emulator.

- [ ] **Step 2: Run the back-navigation matrix**
Interact with the app once (tap anything) before testing back, then verify each row with BOTH the gesture (edge-swipe from left) AND the 3-button/hardware back:

| From | Action | Expected result |
| --- | --- | --- |
| Home (`/home`) | back, first press | Toast "Nhấn back lần nữa để thoát"; app stays open |
| Home (`/home`) | back, second press within 2s | App exits |
| Folder one level deep | back | Returns to Home |
| Folder B (subfolder of A) | back | Returns to Folder A (one level up) |
| Folder A (after returning from B) | back | Returns to Home |
| PDF viewer | back | Returns to the folder that opened it |

- [ ] **Step 3: Record the outcome**
- If every row passes on the debug build → the explicit handler resolved it; **skip Task 6** and proceed to Task 7.
- If back still exits the app / the toast never appears (the `ionBackButton` handler is not firing at all) → proceed to Task 6 to confirm the debug-build root cause.

---

### Task 6: (Conditional) Confirm the debug-build root cause via a release build
**Run only if Task 5 failed** (handler not firing on debug). This isolates suspect #1 (ionic-framework#26599).
**Files:** none (diagnostic only)

- [ ] **Step 1: Produce a release build and run it on the device**
If a signing config already exists:
```bash
npm run build && npx cap sync android && npx cap run android --release
```
If no release signing is configured, build the release variant from Gradle (a debug keystore is acceptable for this diagnostic only):
```bash
npm run build && npx cap sync android && cd android && ./gradlew assembleRelease
```
Then install the produced `android/app/build/outputs/apk/release/*.apk` on the device and launch it.

- [ ] **Step 2: Re-run the Task 5 matrix on the release build**
Expected, if suspect #1 is correct: back navigation works correctly on the release build while it did not on debug.

- [ ] **Step 3: Document the finding**
Add a short note to `CHANGELOG.md` under the v0.5.1 entry (see Task 7) stating that hardware back does not fire on debug builds due to ionic-framework#26599 and works on release builds, so debug-build back testing is a known limitation. No code change is required for the release path; the handler from Tasks 2–4 provides the intended root-exit confirmation behavior on release.

---

### Task 7: Version bump, changelog, and final commit
**Files:**
- Modify: `package.json` (version)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Bump the version**
In `package.json`, change the `"version"` field from `0.5.0` to `0.5.1`.

- [ ] **Step 2: Add the changelog entry**
Add to the top of `CHANGELOG.md`:
```markdown
## [0.5.1] - 2026-06-20
### Fixed
- Android hardware/gesture back now navigates one step up (folder → parent → home, viewer → folder) instead of exiting the app.
- Back at the home root now asks for a second press ("Nhấn back lần nữa để thoát") before exiting, preventing accidental exits.
### Added
- `decideBackAction` pure decision function with unit tests.
- `useAndroidBackButton` hook wiring Ionic's `ionBackButton` event (priority -1, overlay-safe) to one-step-up navigation.
- `@capacitor/app` dependency.
```
> If Task 6 ran, append the debug-build limitation note from Task 6 Step 3 to the entry above.

- [ ] **Step 3: Run the full suite one last time**
Run:
```bash
npx vitest run
```
Expected: PASS — all 43 tests green.

- [ ] **Step 4: Commit**
```bash
git add package.json CHANGELOG.md
git commit -m "chore: release v0.5.1 — Android back navigation"
```

---

## Self-Review

**Spec coverage:**
- "back lùi 1 cấp folder" → Task 2 (`canGoBack → go-back`) + Task 5 matrix rows for nested folders. Covered.
- "viewer back → folder" → Task 5 viewer row; same `go-back` path. Covered.
- "không văng app ở root" → `confirm-exit`/`exit` branches (Task 2) + double-tap toast (Task 3) + Task 5 home rows. Covered.
- Debug-build suspicion → Task 5 outcome branch + Task 6 conditional release test. Covered.
- Missing `@capacitor/app` dependency → Task 1. Covered.
- Overlay-safety (don't break future modals/sheets) → priority -1 registration (Task 3) + documented rationale. Covered.

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command shows expected output. Clear.

**Type consistency:** `BackState { canGoBack, exitArmed }` and `BackAction = 'go-back' | 'confirm-exit' | 'exit'` defined in Task 2 are used identically by `decideBackAction` calls in Task 3. `useAndroidBackButton(): void` defined in Task 3 is imported and called unchanged in Task 4. `EXIT_CONFIRM_WINDOW_MS` is defined once and reused for both the timer and the toast duration. Consistent.
