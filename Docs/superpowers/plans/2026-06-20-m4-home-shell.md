# M4 — UI shell (Home lai + điều hướng) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bộ mặt thật của app — màn Home lai (header + đèn sync dạng pill có chữ, ô search lối tắt, MỘT card "Đang đọc dở", danh sách môn 1 cột có swatch màu + badge ⏳), điều hướng môn→chương→… độ sâu bất kỳ bằng breadcrumb, bottom nav 4 tab. Thay hẳn `SafPoc.tsx` bằng giao diện thật, cắm `repo.listMon()/listFolder()` (M2) + đèn sync (M3) vào.

**Architecture:** Ionic React + IonReactRouter + IonTabs. Theme "nâu giấy" qua CSS variables (spec 9.3) + font bundle offline (Merriweather/Montserrat qua `@fontsource`, KHÔNG CDN — app offline-first). Logic thuần (reading-progress store, gộp số liệu môn) tách khỏi UI để TDD. **Viewer thật là M5** — M4 chỉ có **placeholder viewer** ghi lại tiến độ đọc để vòng "đang đọc dở" chạy được; M5 sẽ thay bằng PDF thật.

**Tech Stack:** @ionic/react + @ionic/react-router (đã có) · react-router (đã có) · @capacitor/preferences (đã có) · `@fontsource/merriweather` + `@fontsource/montserrat` (mới) · ionicons (đã có) · Vitest.

**Phạm vi:** CHỈ M4. **KHÔNG** build Viewer PDF thật (M5 — chỉ placeholder route). **KHÔNG** build Import/Share thật (M6 — tab "Thêm" là placeholder). **KHÔNG** build Search engine (Phase 2 — tab "Tìm" + ô search Home chỉ là lối tắt/placeholder, không truy vấn). KHÔNG đụng native plugin (Saf/Syncthing đã xong). Tái dùng nguyên `src/storage/*` (M2) + `src/sync/*` (M3).

**Tiền đề:** M1+M2+M3 đã xong & verify trên SM-S908E. Repo có: `repo.listMon()/listFolder(uri)`, types `Mon/FolderListing/Document/PendingDoc/SubFolder`, `useSyncStatus()` (trả `'synced'|'syncing'|'offline'|'unconfigured'`), `SyncSettings` modal, `pickAndSaveRoot()/rootHasPermission()/getRootUri()`. Fixture kho mẫu sinh bằng `node scripts/make-fixture.mjs` + `adb push` (M2 Task 3.2).

**Palette (spec 9.3) — CSS variables:**
- Nền kem `#E9E5CD`; card/nền sáng `#FBF7F0`, `#FFFDF8`; trắng `#FFFFFF`.
- Nâu nhấn `#75420E`; nâu đậm `#553B08`; xám phụ `#AAAAAA`.
- Cam đất cho badge ⏳: `#B5651D` (đề xuất, hài hoà nâu giấy).

---

## File Structure (M4)

- `src/theme/variables.css` — **tạo**: Ionic CSS variables nâu giấy + font.
- `src/theme/fonts.ts` — **tạo**: import `@fontsource` (offline).
- `src/main.tsx` — **sửa**: import theme + fonts.
- `src/App.tsx` — **sửa**: IonReactRouter + IonTabs + routes (thay toàn bộ shell PoC).
- `src/reading/progress.ts` + `progress.test.ts` — **tạo**: store tiến độ đọc (Preferences), TDD.
- `src/storage/summary.ts` + `summary.test.ts` — **tạo**: gộp số tài liệu + số chờ xử lý của một môn (đệ quy), TDD phần thuần.
- `src/pages/HomePage.tsx` — **tạo**: Home lai.
- `src/pages/FolderPage.tsx` — **tạo**: xem trong môn/chương (breadcrumb, drill).
- `src/pages/ViewerPlaceholderPage.tsx` — **tạo**: placeholder viewer (ghi progress) — M5 thay.
- `src/pages/SettingsPage.tsx` — **tạo**: chọn folder kho (SAF) + mở Sync settings.
- `src/pages/SearchStubPage.tsx`, `src/pages/AddStubPage.tsx` — **tạo**: placeholder tab Tìm/Thêm.
- `src/components/SyncPill.tsx` — **tạo**: đèn sync pill có chữ (thay `SyncLight` ở header).
- `src/components/ContinueReadingCard.tsx` — **tạo**.
- `src/components/MonCard.tsx` — **tạo**.
- `src/components/SearchShortcut.tsx` — **tạo**.
- `src/components/MonSwatch.tsx` — **tạo** (ô màu + chữ cái đầu).
- **Xoá:** `src/poc/SafPoc.tsx` (thay bằng Home thật) — cùng lúc gỡ import trong App.

> Giữ `src/sync/SyncLight.tsx` cũ? Không cần — thay bằng `SyncPill`. Có thể xoá `SyncLight.tsx` nếu không còn ai import. Smoke test `App.test.tsx` phải vẫn pass (text "Gú's Library" xuất hiện ở Home header).

---

## Phase A — Theme, fonts, routing skeleton

### Task A1: Palette + font offline

**Files:**
- Create: `src/theme/variables.css`, `src/theme/fonts.ts`
- Modify: `src/main.tsx`
- Modify: `package.json` (fontsource)

- [ ] **Step 1: Cài font offline**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
npm install @fontsource/merriweather @fontsource/montserrat
```

- [ ] **Step 2: Tạo src/theme/fonts.ts**

```ts
// Bundle font cục bộ (offline-first) — KHÔNG dùng Google Fonts CDN.
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/merriweather/400.css';
import '@fontsource/merriweather/700.css';
```

- [ ] **Step 3: Tạo src/theme/variables.css**

```css
/* Tông "nâu giấy" — spec 9.3/9.4 */
:root {
  --gu-cream: #E9E5CD;
  --gu-paper: #FBF7F0;
  --gu-paper-2: #FFFDF8;
  --gu-white: #FFFFFF;
  --gu-brown: #75420E;
  --gu-brown-deep: #553B08;
  --gu-grey: #AAAAAA;
  --gu-pending: #B5651D;

  --ion-font-family: 'Montserrat', system-ui, sans-serif;
  --gu-serif: 'Merriweather', Georgia, serif;

  --ion-background-color: var(--gu-cream);
  --ion-background-color-rgb: 233, 229, 205;
  --ion-text-color: #2b2b2b;
  --ion-text-color-rgb: 43, 43, 43;

  /* primary = nâu nhấn */
  --ion-color-primary: #75420E;
  --ion-color-primary-rgb: 117,66,14;
  --ion-color-primary-contrast: #ffffff;
  --ion-color-primary-contrast-rgb: 255,255,255;
  --ion-color-primary-shade: #553B08;
  --ion-color-primary-tint: #855a2a;

  --ion-toolbar-background: var(--gu-paper-2);
  --ion-tab-bar-background: var(--gu-paper-2);
  --ion-item-background: var(--gu-paper);
  --ion-card-background: var(--gu-paper-2);
}

/* tiêu đề/nội dung đọc = serif */
.gu-serif { font-family: var(--gu-serif); }
.gu-title { font-family: var(--gu-serif); font-weight: 700; color: var(--gu-brown-deep); }
```

- [ ] **Step 4: Sửa src/main.tsx (import theme + fonts trước render)**

Thêm vào đầu `src/main.tsx` (sau import React):

```ts
import './theme/fonts';
import './theme/variables.css';
```

- [ ] **Step 5: Verify build**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(m4): brown-paper theme variables + offline Merriweather/Montserrat"
```

### Task A2: Router + Tabs skeleton (thay shell PoC)

**Files:**
- Modify: `src/App.tsx`
- Create: `src/pages/SearchStubPage.tsx`, `src/pages/AddStubPage.tsx`, `src/pages/SettingsPage.tsx` (tạm tối thiểu để route chạy; nội dung đủ sau)
- (HomePage/FolderPage/Viewer tạo ở phase sau — tạm route tới placeholder inline)

- [ ] **Step 1: Tạo các stub page tối thiểu**

`src/pages/SearchStubPage.tsx`:
```tsx
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';
export default function SearchStubPage() {
  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Tìm</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding"><p>Tìm kiếm toàn văn — Phase 2.</p></IonContent>
    </IonPage>
  );
}
```
`src/pages/AddStubPage.tsx`:
```tsx
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';
export default function AddStubPage() {
  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Thêm</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding"><p>Thêm tài liệu (Share Intent) — M6.</p></IonContent>
    </IonPage>
  );
}
```

- [ ] **Step 2: Tạo SettingsPage tối thiểu (chọn folder kho + Sync settings)**

`src/pages/SettingsPage.tsx`:
```tsx
import { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonButton, IonNote,
} from '@ionic/react';
import { getRootUri, pickAndSaveRoot } from '../storage/repo';
import SyncSettings from '../sync/SyncSettings';

export default function SettingsPage() {
  const [root, setRoot] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);

  useEffect(() => { getRootUri().then(setRoot); }, []);

  const pick = async () => { await pickAndSaveRoot(); setRoot(await getRootUri()); };

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Cài đặt</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding">
        <IonList>
          <IonItem button onClick={pick}>
            <IonLabel>
              <h2>Folder kho</h2>
              <IonNote>{root ?? 'Chưa chọn — bấm để chọn folder Syncthing'}</IonNote>
            </IonLabel>
          </IonItem>
          <IonItem button onClick={() => setSyncOpen(true)}>
            <IonLabel><h2>Đồng bộ (Syncthing)</h2><IonNote>API key + chọn mini PC</IonNote></IonLabel>
          </IonItem>
        </IonList>
        <SyncSettings isOpen={syncOpen} onClose={() => setSyncOpen(false)} />
      </IonContent>
    </IonPage>
  );
}
```

- [ ] **Step 3: Thay src/App.tsx bằng router + tabs**

```tsx
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { home, search, add, settings } from 'ionicons/icons';

import HomePage from './pages/HomePage';
import FolderPage from './pages/FolderPage';
import ViewerPlaceholderPage from './pages/ViewerPlaceholderPage';
import SearchStubPage from './pages/SearchStubPage';
import AddStubPage from './pages/AddStubPage';
import SettingsPage from './pages/SettingsPage';

/* Ionic core + theming CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

setupIonicReact();

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/home" component={HomePage} />
            <Route exact path="/folder/:uri" component={FolderPage} />
            <Route exact path="/viewer/:uri" component={ViewerPlaceholderPage} />
            <Route exact path="/search" component={SearchStubPage} />
            <Route exact path="/add" component={AddStubPage} />
            <Route exact path="/settings" component={SettingsPage} />
            <Route exact path="/"><Redirect to="/home" /></Route>
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/home">
              <IonIcon icon={home} /><IonLabel>Trang chủ</IonLabel>
            </IonTabButton>
            <IonTabButton tab="search" href="/search">
              <IonIcon icon={search} /><IonLabel>Tìm</IonLabel>
            </IonTabButton>
            <IonTabButton tab="add" href="/add">
              <IonIcon icon={add} /><IonLabel>Thêm</IonLabel>
            </IonTabButton>
            <IonTabButton tab="settings" href="/settings">
              <IonIcon icon={settings} /><IonLabel>Cài đặt</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
}
```

> Lưu ý: HomePage/FolderPage/ViewerPlaceholderPage tạo ở Phase C/D. Để compile được ngay, có thể tạo bản tối thiểu trước (chỉ IonPage + title) rồi hoàn thiện sau — nhưng theo thứ tự plan, Phase B (logic) không cần chúng; tạo các page rỗng tối thiểu ở Step này để build xanh, hoàn thiện ở Phase C/D.

- [ ] **Step 4: Tạo bản tối thiểu HomePage/FolderPage/ViewerPlaceholderPage để build xanh**

Tạo 3 file, mỗi file một `IonPage` với `IonTitle` tạm ("Gú's Library" cho HomePage để smoke test pass). Ví dụ `src/pages/HomePage.tsx`:
```tsx
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';
export default function HomePage() {
  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Gú's Library</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding"><p>Home — đang dựng (M4).</p></IonContent>
    </IonPage>
  );
}
```
`FolderPage.tsx` và `ViewerPlaceholderPage.tsx` tương tự (title "Môn", "Tài liệu").

- [ ] **Step 5: Verify smoke test + build**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm test && npm run build`
Expected: smoke test "renders the app title" PASS (HomePage có "Gú's Library"); build PASS.
(Nếu smoke test render `<App/>` mà IonReactRouter cần history — Vitest jsdom OK với IonReactRouter; nếu lỗi router trong test, đổi App.test để render HomePage trực tiếp HOẶC bọc trong MemoryRouter. KHÔNG xoá assert text. Report nếu vướng.)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(m4): IonReactRouter + bottom tabs skeleton; minimal pages"
```

---

## Phase B — Logic thuần (TDD)

### Task B1: Reading-progress store

**Files:**
- Create: `src/reading/progress.ts`, `src/reading/progress.test.ts`

- [ ] **Step 1: Test thất bại trước**

`src/reading/progress.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @capacitor/preferences bằng store trong bộ nhớ.
const mem = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: mem.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => { mem.set(key, value); },
    remove: async ({ key }: { key: string }) => { mem.delete(key); },
  },
}));

import { setProgress, getContinueReading, clearProgress } from './progress';

beforeEach(() => mem.clear());

describe('reading progress', () => {
  it('returns null when nothing read', async () => {
    expect(await getContinueReading()).toBeNull();
  });
  it('stores and returns the most recent doc', async () => {
    await setProgress({ docUri: 'content://a', name: 'A', monName: 'Môn 1', page: 3, total: 10 });
    const c = await getContinueReading();
    expect(c).toMatchObject({ docUri: 'content://a', page: 3, total: 10, name: 'A' });
  });
  it('continue = the latest updated (by lastReadAt)', async () => {
    await setProgress({ docUri: 'content://a', name: 'A', monName: 'm', page: 1, total: 5 });
    await setProgress({ docUri: 'content://b', name: 'B', monName: 'm', page: 2, total: 5 });
    expect((await getContinueReading())?.docUri).toBe('content://b');
  });
  it('updating same doc keeps one entry, updates page', async () => {
    await setProgress({ docUri: 'content://a', name: 'A', monName: 'm', page: 1, total: 5 });
    await setProgress({ docUri: 'content://a', name: 'A', monName: 'm', page: 4, total: 5 });
    expect((await getContinueReading())?.page).toBe(4);
  });
  it('clearProgress removes it', async () => {
    await setProgress({ docUri: 'content://a', name: 'A', monName: 'm', page: 1, total: 5 });
    await clearProgress('content://a');
    expect(await getContinueReading()).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy → FAIL**

Run: `npx vitest run src/reading/progress.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement src/reading/progress.ts**

```ts
import { Preferences } from '@capacitor/preferences';

const KEY = 'reading_progress';

export interface Progress {
  docUri: string;
  name: string;
  monName: string;
  page: number;
  total: number;
  lastReadAt: number;
}

type Store = Record<string, Progress>;

async function load(): Promise<Store> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return {};
  try { return JSON.parse(value) as Store; } catch { return {}; }
}
async function save(s: Store): Promise<void> {
  await Preferences.set({ key: KEY, value: JSON.stringify(s) });
}

export async function setProgress(p: Omit<Progress, 'lastReadAt'>): Promise<void> {
  const s = await load();
  s[p.docUri] = { ...p, lastReadAt: Date.now() };
  await save(s);
}

export async function getContinueReading(): Promise<Progress | null> {
  const s = await load();
  const all = Object.values(s);
  if (all.length === 0) return null;
  return all.sort((a, b) => b.lastReadAt - a.lastReadAt)[0];
}

export async function clearProgress(docUri: string): Promise<void> {
  const s = await load();
  delete s[docUri];
  await save(s);
}
```

- [ ] **Step 4: Chạy → PASS**

Run: `npx vitest run src/reading/progress.test.ts` → PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(m4): reading-progress store (continue reading) with tests"
```

### Task B2: Gộp số liệu môn (đệ quy)

**Files:**
- Create: `src/storage/summary.ts`, `src/storage/summary.test.ts`

- [ ] **Step 1: Test thất bại trước (logic thuần, không SAF)**

`src/storage/summary.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { accumulate, type FolderLister } from './summary';
import type { FolderListing } from './types';

// Giả lập cây bằng map uri -> listing (không gọi SAF thật).
function makeLister(tree: Record<string, FolderListing>): FolderLister {
  return async (uri: string) => tree[uri] ?? { folders: [], documents: [], pending: [], hasPending: false };
}
const L = (o: Partial<FolderListing>): FolderListing =>
  ({ folders: [], documents: [], pending: [], hasPending: false, ...o });

describe('accumulate (đếm tài liệu + chờ xử lý đệ quy)', () => {
  it('counts docs + pending at one level', async () => {
    const lister = makeLister({
      'mon': L({ documents: [{ name: 'a', pdfUri: 'p', jsonUri: 'j' }], pending: [{ name: 'x.docx', ext: 'docx', sourceUri: 's' }], hasPending: true }),
    });
    expect(await accumulate('mon', lister)).toEqual({ documents: 1, pending: 1 });
  });
  it('recurses into subfolders (arbitrary depth)', async () => {
    const lister = makeLister({
      'mon': L({ folders: [{ name: 'Chương 1', uri: 'c1' }], documents: [{ name: 'a', pdfUri: 'p', jsonUri: 'j' }] }),
      'c1': L({ folders: [{ name: 'Buổi 2', uri: 'b2' }], documents: [{ name: 'b', pdfUri: 'p', jsonUri: 'j' }] }),
      'b2': L({ documents: [{ name: 'c', pdfUri: 'p', jsonUri: 'j' }], pending: [{ name: 'y.pptx', ext: 'pptx', sourceUri: 's' }], hasPending: true }),
    });
    expect(await accumulate('mon', lister)).toEqual({ documents: 3, pending: 1 });
  });
  it('zero for empty folder', async () => {
    expect(await accumulate('empty', makeLister({}))).toEqual({ documents: 0, pending: 0 });
  });
});
```

- [ ] **Step 2: Chạy → FAIL**

Run: `npx vitest run src/storage/summary.test.ts` → FAIL.

- [ ] **Step 3: Implement src/storage/summary.ts**

```ts
import type { FolderListing } from './types';
import { listFolder } from './repo';

export type FolderLister = (uri: string) => Promise<FolderListing>;

export interface MonSummary { documents: number; pending: number; }

// Đếm đệ quy số tài liệu (cặp pdf+json) + số chờ xử lý trong cả cây của một môn.
// Nhận lister để test được không cần SAF; mặc định dùng repo.listFolder.
export async function accumulate(uri: string, lister: FolderLister): Promise<MonSummary> {
  const listing = await lister(uri);
  let documents = listing.documents.length;
  let pending = listing.pending.length;
  for (const f of listing.folders) {
    const sub = await accumulate(f.uri, lister);
    documents += sub.documents;
    pending += sub.pending;
  }
  return { documents, pending };
}

export function summarizeMon(uri: string): Promise<MonSummary> {
  return accumulate(uri, listFolder);
}
```

- [ ] **Step 4: Chạy → PASS + toàn bộ test + build**

Run: `npx vitest run src/storage/summary.test.ts` → PASS (3).
Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm test && npm run build` → tất cả PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(m4): recursive mon summary (doc + pending counts) with tests"
```

---

## Phase C — Home screen

### Task C1: Component nhỏ (SyncPill, SearchShortcut, MonSwatch)

**Files:**
- Create: `src/components/SyncPill.tsx`, `src/components/SearchShortcut.tsx`, `src/components/MonSwatch.tsx`

- [ ] **Step 1: src/components/SyncPill.tsx** (đèn pill CÓ CHỮ — spec 9.4)

```tsx
import { IonChip, IonIcon, IonLabel } from '@ionic/react';
import { checkmarkCircle, syncCircle, warningOutline, settingsOutline } from 'ionicons/icons';
import type { SyncState } from '../sync/useSyncStatus';

const MAP: Record<SyncState, { icon: string; color: string; label: string }> = {
  synced: { icon: checkmarkCircle, color: 'success', label: 'Đã đồng bộ' },
  syncing: { icon: syncCircle, color: 'warning', label: 'Đang đẩy…' },
  offline: { icon: warningOutline, color: 'danger', label: 'Chưa thấy mini PC' },
  unconfigured: { icon: settingsOutline, color: 'medium', label: 'Chưa cấu hình' },
};

export default function SyncPill({ state, onClick }: { state: SyncState; onClick: () => void }) {
  const m = MAP[state];
  return (
    <IonChip color={m.color} onClick={onClick} aria-label={m.label} style={{ cursor: 'pointer' }}>
      <IonIcon icon={m.icon} />
      <IonLabel>{m.label}</IonLabel>
    </IonChip>
  );
}
```

- [ ] **Step 2: src/components/SearchShortcut.tsx** (ô search lối tắt → route /search)

```tsx
import { IonIcon } from '@ionic/react';
import { search } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

export default function SearchShortcut() {
  const history = useHistory();
  return (
    <div
      onClick={() => history.push('/search')}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--gu-white)', border: '1px solid var(--gu-grey)',
        borderRadius: 999, padding: '10px 16px', margin: '8px 0', cursor: 'pointer',
        color: 'var(--gu-grey)',
      }}
    >
      <IonIcon icon={search} />
      <span>Tìm trong tài liệu…</span>
    </div>
  );
}
```

- [ ] **Step 3: src/components/MonSwatch.tsx** (ô màu vuông + chữ cái đầu)

```tsx
const PALETTE = ['#75420E', '#553B08', '#8a5a2a', '#6b4f2a', '#9c6b3f'];

function colorFor(name: string, explicit?: string): string {
  if (explicit) return explicit;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function MonSwatch({ name, color }: { name: string; color?: string }) {
  const bg = colorFor(name, color);
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 8, background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 20, fl: '0 0 auto',
    }}>{initial}</div>
  );
}
```
(Sửa `fl: '0 0 auto'` → `flex: '0 0 auto'`.)

- [ ] **Step 4: Verify build**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm run build` → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(m4): SyncPill (labeled), SearchShortcut, MonSwatch components"
```

### Task C2: ContinueReadingCard + MonCard

**Files:**
- Create: `src/components/ContinueReadingCard.tsx`, `src/components/MonCard.tsx`

- [ ] **Step 1: src/components/ContinueReadingCard.tsx**

```tsx
import { IonIcon } from '@ionic/react';
import { bookOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import type { Progress } from '../reading/progress';

export default function ContinueReadingCard({ progress }: { progress: Progress }) {
  const history = useHistory();
  const pct = progress.total > 0 ? Math.round((progress.page / progress.total) * 100) : 0;
  return (
    <div
      onClick={() => history.push(`/viewer/${encodeURIComponent(progress.docUri)}`)}
      style={{
        background: 'var(--gu-brown-deep)', color: '#fff', borderRadius: 16,
        padding: 16, margin: '12px 0', display: 'flex', gap: 14, cursor: 'pointer',
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 10, background: 'rgba(255,255,255,.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
      }}>
        <IonIcon icon={bookOutline} style={{ fontSize: 28 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 17 }}>{progress.name}</div>
        <div style={{ opacity: .8, fontSize: 13 }}>{progress.monName}</div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.25)', margin: '8px 0 4px' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#fff' }} />
        </div>
        <div style={{ fontSize: 12, opacity: .85 }}>Trang {progress.page} / {progress.total} · chạm để đọc tiếp</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: src/components/MonCard.tsx**

```tsx
import { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { chevronForward } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import MonSwatch from './MonSwatch';
import type { Mon } from '../storage/types';
import { summarizeMon, type MonSummary } from '../storage/summary';

export default function MonCard({ mon }: { mon: Mon }) {
  const history = useHistory();
  const [sum, setSum] = useState<MonSummary | null>(null);
  useEffect(() => { summarizeMon(mon.uri).then(setSum).catch(() => setSum({ documents: 0, pending: 0 })); }, [mon.uri]);

  return (
    <div
      onClick={() => history.push(`/folder/${encodeURIComponent(mon.uri)}`)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gu-paper-2)',
        borderRadius: 12, padding: 12, margin: '8px 0', cursor: 'pointer',
      }}
    >
      <MonSwatch name={mon.name} color={mon.meta.color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, color: 'var(--gu-brown-deep)' }}>{mon.name}</div>
        <div style={{ fontSize: 13, color: 'var(--gu-grey)' }}>
          {sum ? `${sum.documents} tài liệu` : 'Đang đếm…'}
        </div>
      </div>
      {sum && sum.pending > 0 && (
        <span style={{
          background: 'var(--gu-pending)', color: '#fff', borderRadius: 999,
          padding: '2px 10px', fontSize: 12, whiteSpace: 'nowrap',
        }}>⏳ {sum.pending} chờ</span>
      )}
      <IonIcon icon={chevronForward} style={{ color: 'var(--gu-grey)' }} />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm run build` → PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(m4): ContinueReadingCard + MonCard (counts + pending badge)"
```

### Task C3: HomePage thật

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Viết HomePage hoàn chỉnh**

```tsx
import { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, useIonViewWillEnter,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import SyncPill from '../components/SyncPill';
import SearchShortcut from '../components/SearchShortcut';
import ContinueReadingCard from '../components/ContinueReadingCard';
import MonCard from '../components/MonCard';
import { useSyncStatus } from '../sync/useSyncStatus';
import { listMon } from '../storage/repo';
import { getRootUri } from '../storage/repo';
import { getContinueReading, type Progress } from '../reading/progress';
import type { Mon } from '../storage/types';

export default function HomePage() {
  const history = useHistory();
  const { light } = useSyncStatus();
  const [mons, setMons] = useState<Mon[]>([]);
  const [hasRoot, setHasRoot] = useState<boolean | null>(null);
  const [cont, setCont] = useState<Progress | null>(null);

  const reload = async () => {
    const root = await getRootUri();
    setHasRoot(!!root);
    setCont(await getContinueReading());
    if (root) {
      try { setMons(await listMon()); } catch { setMons([]); }
    } else {
      setMons([]);
    }
  };
  useIonViewWillEnter(() => { reload(); });
  useEffect(() => { reload(); }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="gu-title">Gú's Library</IonTitle>
          <IonButtons slot="end">
            <SyncPill state={light} onClick={() => history.push('/settings')} />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <SearchShortcut />

        {cont && <ContinueReadingCard progress={cont} />}

        {hasRoot === false && (
          <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--gu-brown)' }}>
            <p>Chưa chọn folder kho.</p>
            <p style={{ fontSize: 14 }}>Vào <b>Cài đặt → Folder kho</b> để chọn folder Syncthing.</p>
          </div>
        )}

        {hasRoot && (
          <>
            <h2 className="gu-title" style={{ fontSize: 18, marginTop: 16 }}>Môn học</h2>
            {mons.length === 0
              ? <p style={{ color: 'var(--gu-grey)' }}>Chưa có môn nào trong kho.</p>
              : mons.map((m) => <MonCard key={m.uri} mon={m} />)}
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
```

- [ ] **Step 2: Verify smoke test + build**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm test && npm run build`
Expected: smoke test "Gú's Library" PASS (Home header có title); build PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m4): real Home (sync pill, search, continue card, mon list, empty states)"
```

---

## Phase D — Navigation + placeholder viewer

### Task D1: FolderPage (breadcrumb + drill độ sâu bất kỳ)

**Files:**
- Modify: `src/pages/FolderPage.tsx`

- [ ] **Step 1: Viết FolderPage**

URL `/folder/:uri` (uri đã encode). Hiển thị: back button (IonBackButton), tên folder hiện tại (lấy tạm từ query/param hoặc state), list folders con (bấm → push `/folder/<sub.uri>`), documents (bấm → `/viewer/<uri>`), pending (mờ + ⏳, không bấm).

```tsx
import { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent,
  IonList, IonItem, IonLabel, IonIcon, IonBadge,
} from '@ionic/react';
import { folderOutline, documentTextOutline, chevronForward } from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { listFolder } from '../storage/repo';
import type { FolderListing } from '../storage/types';

export default function FolderPage() {
  const { uri } = useParams<{ uri: string }>();
  const decoded = decodeURIComponent(uri);
  const history = useHistory();
  const [listing, setListing] = useState<FolderListing | null>(null);

  useEffect(() => { listFolder(decoded).then(setListing).catch(() => setListing(null)); }, [decoded]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
          <IonTitle className="gu-title">Môn / Chương</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!listing && <p>Đang tải…</p>}
        {listing && (
          <IonList>
            {listing.folders.map((f) => (
              <IonItem key={f.uri} button onClick={() => history.push(`/folder/${encodeURIComponent(f.uri)}`)}>
                <IonIcon icon={folderOutline} slot="start" />
                <IonLabel className="gu-serif">{f.name}</IonLabel>
                <IonIcon icon={chevronForward} slot="end" />
              </IonItem>
            ))}
            {listing.documents.map((d) => (
              <IonItem key={d.pdfUri} button onClick={() => history.push(`/viewer/${encodeURIComponent(d.pdfUri)}`)}>
                <IonIcon icon={documentTextOutline} slot="start" />
                <IonLabel className="gu-serif">{d.name}</IonLabel>
              </IonItem>
            ))}
            {listing.pending.map((p) => (
              <IonItem key={p.sourceUri} disabled>
                <IonLabel color="medium">{p.name}</IonLabel>
                <IonBadge slot="end" style={{ background: 'var(--gu-pending)' }}>⏳ chờ xử lý</IonBadge>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
}
```

> **Breadcrumb độ sâu bất kỳ:** IonBackButton + chuỗi route `/folder/...` lồng nhau cho phép lùi từng cấp (back stack = breadcrumb). Tên folder hiện tại: M4 đơn giản hiển thị "Môn / Chương"; nếu muốn tên thật, truyền qua `history.push('/folder/'+uri, { name })` và đọc `location.state` — tùy chọn, không bắt buộc cho nghiệm thu (điều hướng + back đúng là đủ).

- [ ] **Step 2: Verify build** → `npm run build` PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m4): FolderPage navigation (drill any depth, pending disabled)"
```

### Task D2: Placeholder viewer (ghi progress — M5 sẽ thay)

**Files:**
- Modify: `src/pages/ViewerPlaceholderPage.tsx`

- [ ] **Step 1: Viết ViewerPlaceholderPage**

Mở `/viewer/:uri`. M4 KHÔNG render PDF. Thay vào đó: hiện tên tài liệu (suy từ uri), một control "trang" giả (nút +/−) để mô phỏng đọc, và **ghi reading-progress** khi mở + khi đổi trang → để card "Đang đọc dở" ở Home hoạt động và nghiệm thu được "mở đúng tài liệu/đúng trang".

```tsx
import { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent,
  IonButton, IonText,
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { setProgress } from '../reading/progress';

const TOTAL = 10; // giả lập — M5 lấy số trang thật từ PDF

function baseName(uri: string): string {
  const last = decodeURIComponent(uri).split('/').pop() ?? uri;
  return last.replace(/\.[^.]+$/, '');
}

export default function ViewerPlaceholderPage() {
  const { uri } = useParams<{ uri: string }>();
  const docUri = decodeURIComponent(uri);
  const name = baseName(docUri);
  const [page, setPage] = useState(1);

  // Ghi tiến độ mỗi khi đổi trang (M5 thay placeholder này bằng PDF thật).
  useEffect(() => {
    setProgress({ docUri, name, monName: 'Đang đọc', page, total: TOTAL });
  }, [docUri, name, page]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
          <IonTitle className="gu-title">{name}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonText><p>Viewer thật là M5. Đây là placeholder để chạy vòng "đang đọc dở".</p></IonText>
        <p>Trang {page} / {TOTAL}</p>
        <IonButton disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trang trước</IonButton>
        <IonButton disabled={page >= TOTAL} onClick={() => setPage((p) => p + 1)}>Trang sau</IonButton>
      </IonContent>
    </IonPage>
  );
}
```

- [ ] **Step 2: Verify build + test** → `npm test && npm run build` PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m4): placeholder viewer that records reading progress (M5 replaces)"
```

### Task D3: Xoá SafPoc

**Files:**
- Delete: `src/poc/SafPoc.tsx`

- [ ] **Step 1: Xoá file + đảm bảo không còn import**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
git rm src/poc/SafPoc.tsx
grep -rn "SafPoc" src/ || echo "no remaining references"
```
(Nếu còn import nào → gỡ. App.tsx đã không dùng SafPoc sau Phase A.)

- [ ] **Step 2: Verify test + build** → `npm test && npm run build` PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore(m4): remove SafPoc (replaced by real Home/Folder UI)"
```

---

## Phase E — Build + cài + nghiệm thu trên máy thật

### Task E1: Build + install + chuẩn bị fixture

- [ ] **Step 1: Đảm bảo fixture có trên máy** (từ M2; nếu chưa)

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
node scripts/make-fixture.mjs ./fixture-kho
bash -lc 'adb shell rm -rf /sdcard/Download/fixture-kho && adb push fixture-kho /sdcard/Download/fixture-kho >/dev/null && echo pushed'
```

- [ ] **Step 2: Build + sync + install**

```bash
bash -lc '
cd /Users/lavopavden/Dev/projects/Gu-Library
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
'
```
Expected: `BUILD SUCCESSFUL` + `Success`.

### Task E2: NGHIỆM THU M4 trên máy thật (thao tác tay)

> Cấu hình một lần (nếu chưa): Cài đặt → Folder kho → chọn `Download/fixture-kho`. (Sync settings là của M3, không bắt buộc cho M4.)

- [ ] Cả màn Home đúng tông nâu giấy; header serif "Gú's Library" + **đèn sync pill có chữ** góc phải; ô search bo tròn.
- [ ] **Danh sách môn** hiện 3 môn (swatch màu + chữ cái đầu; `Tố tụng Hình sự` màu nâu `#75420E`); mỗi môn có "số tài liệu"; môn có file chờ hiện **pill "⏳ N chờ"** (Aa Dân sự, Tố tụng Hình sự).
- [ ] **Điều hướng:** bấm `Tố tụng Hình sự` → `Chương 1` → `Buổi 2`; back lùi từng cấp đúng. `bai-tap.docx` hiện mờ + ⏳, **không bấm xem được**; `slide-buoi-2` bấm được.
- [ ] **Đang đọc dở:** bấm một tài liệu (vd `slide-buoi-2`) → placeholder viewer → bấm "Trang sau" vài lần → back về Home → **card "Đang đọc dở" xuất hiện** đúng tên + đúng trang; bấm card → mở lại đúng tài liệu, đúng trang.
- [ ] **Empty state:** (tùy chọn) nếu bỏ chọn folder kho → Home hướng dẫn vào Cài đặt.
- [ ] **Bottom nav** 4 tab chuyển được (Tìm/Thêm là placeholder; Cài đặt mở được).

✅ **M4 ĐẠT** khi Home + danh sách môn + điều hướng + vòng "đang đọc dở" + badge ⏳ đúng.

- [ ] **Commit chốt M4**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
git add -A && git commit -m "feat(m4): UI shell verified on device — Home, nav, continue-reading, pending badges"
```

---

## Nghiệm thu M4 (đối chiếu build brief)

- [x] Home hiện đúng card "đang đọc dở" và danh sách môn từ kho mẫu. **ĐẠT**.
- [x] Bấm card đang đọc dở → mở đúng tài liệu, đúng trang dừng. **ĐẠT** (sau fix khôi phục trang).
- [x] Điều hướng được vào môn lồng nhiều tầng, breadcrumb đúng. **ĐẠT** (sau fix base64url route param).
- [x] Tài liệu chờ xử lý hiện mờ + nhãn ⏳, không bấm xem được. **ĐẠT**.

> **M4 ĐÓNG (2026-06-20).** Verify trên SM-S908E với kho thật + fixture. 3 bug phát hiện & sửa lúc nghiệm thu:
> 1. Folder ẩn Syncthing (`.stfolder`/`.stversions`) hiện như môn → `classifyEntries`+`listMon` lọc folder dot.
> 2. Điều hướng kẹt "Đang tải…" → content-URI bị double-decode qua route param → dùng base64url (`src/storage/uriParam.ts`).
> 3. Card đang-đọc-dở mở lại trang 1 → viewer placeholder khôi phục trang đã lưu (`getProgressFor`).
> Home chỉ hiện môn (folder cấp 1); file lẻ ở gốc kho không hiển thị (đúng data model). 33 unit test xanh. Viewer vẫn là placeholder — M5 thay bằng PDF thật.

## Self-review notes (đối chiếu spec 9.1/9.3/9.4)

- **9.4 thứ tự 5 khối** (header+pill / search / 1 card đang-đọc-dở / list môn 1 cột / bottom nav): HomePage + App tabs. ✓
- **Đèn sync PILL có chữ** (không chỉ chấm): `SyncPill` (IonChip + IonLabel), tái dùng `useSyncStatus` (M3). ✓
- **MỘT card đang đọc dở**, nền nâu đậm, progress + "Trang X/Y · chạm đọc tiếp", 0 chạm phụ (push thẳng viewer). ✓
- **List môn 1 cột** (không lưới), swatch màu + chữ cái đầu, số tài liệu, **badge ⏳ pill "N chờ"** (cấp môn, đếm đệ quy `summarizeMon`), chevron. ✓ Cấp tài liệu ⏳ ở FolderPage. ✓
- **Font:** Merriweather (serif) cho tên môn/tài liệu/tiêu đề (`.gu-title`/`.gu-serif`); Montserrat (sans) cho UI (`--ion-font-family`). Bundle offline qua `@fontsource`. ✓
- **Palette 9.3** trong `variables.css` (kem/nâu/nâu đậm/cam đất). ✓
- **Empty states 9.4:** ẩn card khi chưa đọc; Home hướng dẫn vào Cài đặt khi chưa cấp quyền folder. ✓
- **Độ sâu bất kỳ** (9.1/4.1): FolderPage đệ quy theo uri + back stack = breadcrumb. ✓
- **Cắm M2+M3:** `listMon/listFolder/summarizeMon` (M2), `useSyncStatus` (M3); thay `SafPoc`. ✓
- **KHÔNG bê chức năng xã hội Goodreads.** ✓
- **Không lấn M5/M6/Phase2:** viewer là placeholder ghi progress (M5 thay); tab Thêm/Tìm + ô search là placeholder. ✓
- **TDD:** `progress` (5 test) + `summary.accumulate` (3 test) thuần, đỏ→xanh; UI/điều hướng là cổng verify trên thiết bị. ✓

## Điểm cần người dùng thao tác tay
- E1/E2: (nếu chưa) chọn folder `Download/fixture-kho` trong Cài đặt; nghiệm thu Home/điều hướng/đang-đọc-dở trên SM-S908E.
