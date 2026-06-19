# M1 — Khởi tạo project & Toolchain — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng bộ khung build ra APK bằng CLI (không Android Studio) — một app rỗng Capacitor + Ionic + React + Vite, build thành công, cài và khởi động được trên 1 thiết bị Android thật.

**Architecture:** Web app React/TypeScript bằng Vite, UI bằng Ionic React, đóng gói native bằng Capacitor. Build hoàn toàn bằng dòng lệnh: `vite build` → `cap sync` → `./gradlew assembleDebug` (Gradle wrapper, không cần Gradle hệ thống) → `adb install`. Toolchain (JDK 17 + Android SDK command-line tools) là **phụ thuộc cứng** và là Part A của plan.

**Tech Stack:** Node 24 / npm 11 (đã có) · **JDK 21 (Temurin)** · Android SDK cmdline-tools + platform-tools + **platforms;android-36 + build-tools;36.0.0** · Vite + React 18 + TypeScript · @ionic/react 8 · **Capacitor 8** (AGP 8.13, Gradle 8.14.3) · Vitest + Testing Library (web smoke test).

> **Cập nhật khi thực thi (2026-06-19):** Capacitor mới nhất là **8.4.0**, yêu cầu **compileSdk/targetSdk 36** và **Java 21** (project sinh ra đặt `sourceCompatibility VERSION_21`). Vì vậy toolchain thực tế đã cài là **JDK 21 + SDK 36** (không phải 17/35 như bản nháp ban đầu). Cả JDK 17 và 21 cùng nằm trong `~/Library/Java/JavaVirtualMachines/`; `JAVA_HOME` trỏ 21.

**Phạm vi:** CHỈ M1. Không đụng storage layer, sync, viewer, schema sidecar (M2+). App rỗng = một màn Ionic hiển thị tiêu đề "Gú's Library". Mọi quyết định mở ở spec mục 15 để dành M2+.

**Môi trường đã kiểm tra (2026-06-19):** Intel Mac (x86_64), macOS 26.5.1. JDK hiện tại = Java 8 (không đủ). Chưa có Android SDK, chưa có Homebrew. Node v24.14.1 + npm 11.11.0 đã sẵn. Thư mục project chưa phải git repo.

**Quy ước đặt tên đã chọn (đổi được):**
- `appId` (applicationId): `com.gulibrary.app`
- `appName` (tên hiển thị): `Gú's Library`
- Thư mục Android SDK: `~/Library/Android/sdk` (vị trí chuẩn Capacitor tự dò)

---

## Part A — Dựng môi trường build (PHỤ THUỘC CỨNG)

> Chạy xong Part A là `java -version` ra 17, `sdkmanager --version` chạy, `adb` chạy. Đây là điều kiện để mọi task Part B build được. Một số bước cần huynh thao tác tay (cài JDK .pkg, cắm máy bật USB debugging) — đã ghi rõ.

### Task A1: Cài JDK 21 (Temurin) — ĐÃ THỰC THI ✅

**Files:** không có file repo; cài vào thư mục user (không sudo).

Cách đã dùng (headless tarball, không cần GUI/.pkg, không đụng Java 8 hệ thống):

```bash
cd /tmp
curl -L -o temurin21.tar.gz "https://api.adoptium.net/v3/binary/latest/21/ga/mac/x64/jdk/hotspot/normal/eclipse"
mkdir -p "$HOME/Library/Java/JavaVirtualMachines"
tar xzf temurin21.tar.gz -C "$HOME/Library/Java/JavaVirtualMachines"
```

(Máy này là Intel x86_64 → URL lấy bản **x64**. Nếu máy Apple Silicon thì đổi `x64`→`aarch64`.)

- [x] **Verify:** `/usr/libexec/java_home -v 21` → trỏ tới `jdk-21.0.11+10/Contents/Home`. `java -version` → `openjdk version "21.0.11"`.

### Task A2: Cài Android SDK command-line tools + packages

**Files:** cài vào `~/Library/Android/sdk`.

- [ ] **Step 1: Tải command-line tools (mac)**

Mở https://developer.android.com/studio#command-line-tools-only → tải gói **"Command line tools only" cho Mac** (`commandlinetools-mac-*.zip`). Chấp nhận điều khoản để tải.

- [ ] **Step 2: Giải nén vào đúng layout sdkmanager yêu cầu**

```bash
mkdir -p "$HOME/Library/Android/sdk/cmdline-tools"
# Giả sử file tải về ở ~/Downloads:
unzip -q "$HOME/Downloads/commandlinetools-mac-"*.zip -d "$HOME/Library/Android/sdk/cmdline-tools"
# sdkmanager bắt buộc nằm trong .../cmdline-tools/latest/
mv "$HOME/Library/Android/sdk/cmdline-tools/cmdline-tools" "$HOME/Library/Android/sdk/cmdline-tools/latest"
```

- [ ] **Step 3: Verify sdkmanager chạy (dùng JDK 17 vừa cài)**

```bash
export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
"$HOME/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager" --version
```
Expected: in ra số version (vd `12.0` hoặc tương tự), không lỗi Java.

- [ ] **Step 4: Cài các package SDK cho Capacitor 8 (compileSdk 36)**

```bash
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
SDK="$HOME/Library/Android/sdk"
yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" \
  "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```
Expected: tải về và in `done`. `yes |` để tự chấp nhận license.
(Đã cài: `platform-tools` 37.0.0, `platforms;android-36`, `build-tools;36.0.0`. SDK 35 cũng có sẵn từ bản nháp, vô hại.)

- [ ] **Step 5: Chấp nhận toàn bộ license**

```bash
yes | "$HOME/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager" --licenses
```
Expected: `All SDK package licenses accepted.`

- [ ] **Step 6: Verify adb đã có**

Run: `"$HOME/Library/Android/sdk/platform-tools/adb" --version`
Expected: in `Android Debug Bridge version ...`.

### Task A3: Set biến môi trường vĩnh viễn

**Files:**
- Modify: `~/.zshrc` (shell mặc định macOS) — nếu huynh dùng bash thì `~/.bash_profile`.

- [ ] **Step 1: Thêm biến môi trường vào ~/.zshrc**

Thêm các dòng sau vào cuối `~/.zshrc`:

```bash
# --- Gú's Library Android toolchain ---
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$JAVA_HOME/bin:$PATH"
```

> **Đã thực thi:** block trên đã được ghi vào `~/.bash_profile` (login shell máy này là bash, không phải zsh). Nếu sau này huynh đổi sang zsh, copy block sang `~/.zshrc`.

- [ ] **Step 2: Nạp lại shell**

Run: `source ~/.zshrc`
(Hoặc mở terminal mới.)

- [ ] **Step 3: Verify cả toolchain trong shell mới**

```bash
java -version 2>&1 | head -1
echo "ANDROID_HOME=$ANDROID_HOME"
sdkmanager --version
adb --version | head -1
```
Expected:
- `openjdk version "17...`
- `ANDROID_HOME=/Users/<huynh>/Library/Android/sdk`
- version sdkmanager
- `Android Debug Bridge version ...`

### Task A4: Cổng kiểm tra toolchain tổng

- [ ] **Step 1: Chạy một lượt kiểm tra cuối**

```bash
java -version; echo "---"; \
echo "JAVA_HOME=$JAVA_HOME"; echo "ANDROID_HOME=$ANDROID_HOME"; echo "---"; \
sdkmanager --list_installed
```
Expected: thấy JDK 17, JAVA_HOME/ANDROID_HOME đều có giá trị, và `sdkmanager --list_installed` liệt kê `platform-tools`, `platforms;android-35`, `build-tools;35.0.0`.

Đạt hết → Part A xong, sang Part B.

---

## Part B — Scaffold app + build APK + cài máy thật

### Task B1: Khởi tạo git repo + scaffold Vite React-TS

**Files:**
- Create: toàn bộ scaffold trong `/Users/lavopavden/Dev/projects/Gu-Library/` (project nằm thẳng ở root repo hiện tại; `Docs/` và `docs/` giữ nguyên).

- [ ] **Step 1: Khởi tạo git**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
git init
printf "node_modules/\ndist/\nandroid/\n.DS_Store\n*.log\n" > .gitignore
```

> Ghi chú: bỏ `android/` khỏi git ở M1 cho gọn (folder native sinh lại được bằng `npx cap add android`). Nếu sau này muốn version-control native config, gỡ dòng `android/` ra.

- [ ] **Step 2: Scaffold Vite React-TS vào thư mục tạm rồi gộp vào root**

`npm create vite` không ghi đè được thư mục đã có file. Tạo ở thư mục tạm rồi move nội dung vào root:

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
npm create vite@latest .vite-scaffold -- --template react-ts
# Gộp vào root (giữ Docs/, docs/, .git, .gitignore)
cp -R .vite-scaffold/. .
rm -rf .vite-scaffold
```

- [ ] **Step 3: Cài dependencies web**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
npm install
```

- [ ] **Step 4: Verify dev build web chạy được**

Run: `npm run build`
Expected: PASS — sinh thư mục `dist/` với `index.html`. Không lỗi TypeScript.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(m1): scaffold Vite React-TS base"
```

### Task B2: Cài Ionic React + dựng app shell rỗng (TDD)

**Files:**
- Modify: `package.json` (thêm deps)
- Modify: `src/main.tsx`
- Create: `src/App.tsx` (ghi đè bản Vite mặc định)
- Create: `src/App.test.tsx`
- Modify: `vite.config.ts` (thêm cấu hình test)
- Modify: `package.json` (script `test`)

- [ ] **Step 1: Cài Ionic React + bộ test**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
npm install @ionic/react @ionic/react-router react-router react-router-dom ionicons
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Viết test thất bại trước — app shell phải render tiêu đề**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App shell', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText("Gú's Library")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Thêm cấu hình test vào vite.config.ts**

Sửa `vite.config.ts` thành (giữ plugin react đã có, thêm khối `test`):

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
```

Create `src/setupTests.ts`:

```ts
import '@testing-library/jest-dom';
```

Thêm script vào `package.json` (khối `"scripts"`):

```json
"test": "vitest run"
```

- [ ] **Step 4: Chạy test để xác nhận FAIL**

Run: `npm test`
Expected: FAIL — `Cannot find module './App'` hoặc không tìm thấy text "Gú's Library" (App.tsx mặc định của Vite chưa có tiêu đề này).

- [ ] **Step 5: Viết App shell tối thiểu bằng Ionic**

Ghi đè `src/App.tsx`:

```tsx
import { IonApp, IonHeader, IonToolbar, IonTitle, IonContent, IonPage, setupIonicReact } from '@ionic/react';

/* Ionic core + theming CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

setupIonicReact();

export default function App() {
  return (
    <IonApp>
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Gú's Library</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p>Kho tài liệu học luật — M1 khung rỗng.</p>
        </IonContent>
      </IonPage>
    </IonApp>
  );
}
```

Ghi đè `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 6: Chạy test để xác nhận PASS**

Run: `npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 7: Verify web build vẫn xanh**

Run: `npm run build`
Expected: PASS, sinh `dist/`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(m1): Ionic React app shell with smoke test"
```

### Task B3: Thêm Capacitor + platform Android

**Files:**
- Create: `capacitor.config.ts`
- Create: `android/` (sinh bởi Capacitor)
- Modify: `package.json`

- [ ] **Step 1: Cài Capacitor core/cli/android**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
npm install @capacitor/core
npm install -D @capacitor/cli
npm install @capacitor/android
```

- [ ] **Step 2: Init Capacitor (web-dir = dist)**

```bash
npx cap init "Gú's Library" com.gulibrary.app --web-dir dist
```
Expected: sinh `capacitor.config.ts` với `appId: 'com.gulibrary.app'`, `webDir: 'dist'`.

- [ ] **Step 3: Build web rồi add platform Android**

```bash
npm run build
npx cap add android
```
Expected: sinh thư mục `android/` (project Gradle với `gradlew`). Không lỗi.

- [ ] **Step 4: Sync web assets vào native**

Run: `npx cap sync android`
Expected: `✔ Sync finished`. Copy `dist/` vào `android/app/src/main/assets/public`.

- [ ] **Step 5: Verify Capacitor thấy đủ toolchain**

Run: `npx cap doctor android`
Expected: liệt kê Capacitor + platform android, không báo thiếu Android SDK / JDK (nhờ Part A).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(m1): add Capacitor + Android platform"
```

### Task B4: Build APK bằng CLI (Gradle wrapper, không Android Studio)

**Files:**
- Sinh: `android/app/build/outputs/apk/debug/app-debug.apk`

- [ ] **Step 1: Đảm bảo JAVA_HOME/ANDROID_HOME đang trỏ đúng**

Run: `echo "$JAVA_HOME" && echo "$ANDROID_HOME"`
Expected: JAVA_HOME trỏ temurin-17, ANDROID_HOME trỏ `~/Library/Android/sdk`. (Nếu rỗng → `source ~/.zshrc`.)

- [ ] **Step 2: Build debug APK bằng Gradle wrapper**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library/android
./gradlew assembleDebug
```
Expected: `BUILD SUCCESSFUL`. Lần đầu Gradle wrapper tự tải đúng phiên bản Gradle (cần mạng cho lần build đầu).

- [ ] **Step 3: Verify file APK tồn tại**

```bash
ls -lh /Users/lavopavden/Dev/projects/Gu-Library/android/app/build/outputs/apk/debug/app-debug.apk
```
Expected: file `app-debug.apk` tồn tại, kích thước vài MB.

> **Cổng nghiệm thu M1 #1:** "Lệnh build CLI ra file APK thành công, không mở Android Studio." — đạt khi Step 2+3 PASS.

### Task B5: Cài và khởi động trên thiết bị Android thật

**Files:** không có; thao tác trên thiết bị.

- [ ] **Step 1: Bật USB debugging trên máy Android (thao tác tay)**

Trên thiết bị: Settings → About phone → bấm **Build number** 7 lần để mở Developer options → vào **Developer options** → bật **USB debugging**. Cắm cáp USB vào Mac. Khi máy hỏi "Allow USB debugging?" → **Allow**.

- [ ] **Step 2: Verify máy được nhận**

Run: `adb devices`
Expected: liệt kê 1 dòng `<serial>    device` (không phải `unauthorized` — nếu unauthorized thì xác nhận lại popup trên điện thoại).

- [ ] **Step 3: Cài APK lên máy**

```bash
adb install -r /Users/lavopavden/Dev/projects/Gu-Library/android/app/build/outputs/apk/debug/app-debug.apk
```
Expected: `Success`.

- [ ] **Step 4: Khởi động app và xác nhận chạy**

```bash
adb shell monkey -p com.gulibrary.app -c android.intent.category.LAUNCHER 1
```
Expected: app **Gú's Library** mở trên thiết bị, hiển thị header "Gú's Library" + dòng nội dung. Không crash.

> **Cổng nghiệm thu M1 #2:** "APK cài và khởi động trên 1 thiết bị Android thật." — đạt khi Step 3+4 PASS.

- [ ] **Step 5: Commit chốt M1**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
git add -A
git commit -m "chore(m1): M1 complete — empty Ionic/Capacitor app builds + installs via CLI"
```

---

## Nghiệm thu M1 (đối chiếu build brief)

- [x] Lệnh build CLI ra file APK thành công, không mở Android Studio. → Task B4. **ĐẠT** (`BUILD SUCCESSFUL`, `app-debug.apk` 4.3M, CLI thuần).
- [x] APK cài và khởi động trên 1 thiết bị Android thật. → Task B5. **ĐẠT** (`adb install` Success trên Samsung SM-S908E; `MainActivity` resumed/foreground, không crash).

> **M1 ĐÓNG (2026-06-19).** Cả hai tiêu chí nghiệm thu đạt trên thiết bị thật. Toolchain thực tế: JDK 21 + Android SDK 36, Capacitor 8.4.0.

## Self-review notes (đã đối chiếu spec)

- **Ràng buộc spec mục 2 ("build hoàn toàn CLI, không Android Studio"):** đáp ứng — chỉ dùng `sdkmanager`, `gradlew`, `cap`, `adb`. Không cài Android Studio.
- **UI framework = Ionic + React (brief M1 + spec 2):** đáp ứng — Task B2 dùng `@ionic/react`.
- **JDK + Android SDK cmdline-tools + Gradle (brief M1):** JDK 17 (A1), cmdline-tools (A2), Gradle qua wrapper (B4) — đã ghi rõ lý do không cần Gradle hệ thống.
- **Không lấn M2+:** không có storage/scoped-storage, sync, viewer, sidecar schema. App rỗng đúng nghĩa.
- **TDD (nguyên tắc chung mục 0):** Task B2 có vòng đỏ→xanh thật (smoke test). Các bước native là cổng verify bằng lệnh + output kỳ vọng (bản chất hạ tầng, không unit-test được).
- **Commit thường (mục 0):** mỗi task kết thúc bằng commit.
- **Điểm cần huynh thao tác tay:** cài JDK `.pkg` (A1), tải cmdline-tools zip (A2), bật USB debugging + Allow (B5). Phần còn lại tự động bằng lệnh.
