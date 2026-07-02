# Changelog

Theo [Semantic Versioning](https://semver.org/). Mỗi milestone Phase 1 = một minor; polish/sửa lỗi = patch.

## [1.2.1] — 2026-07-02 — Fix badge "Chưa thấy mini PC" báo sai ở Prod
### Investigation (code trace)
- Badge offline khi 1 trong 3: connections null / device không connected / **completion null**. `useSyncStatus` query `/rest/db/completion?folder=${cfg.folderId}&...` nhưng `st_folder_id` **KHÔNG bao giờ được set** (`setFolderId` không chỗ nào gọi, không UI) → luôn rơi về **`DEFAULT_FOLDER='gu-library-kho'` (hardcode QA)**. Ở Prod (folder `gu-library-kho-prod`) → query folder không tồn tại → non-200 → `completion=null` → `deriveLight`→'offline' dù device connected. QA đúng vì default trùng folder QA.
### Fixed
- Query completion **theo device** (`/rest/db/completion?device=<minipc>`, Syncthing gộp mọi folder share) — bỏ hẳn folder-ID hardcode → chạy đúng với BẤT KỲ kho nào (local-first).
- `deriveLight`: connected + completion null → **'synced'** (vẫn "thấy mini PC"); offline CHỈ khi device thật sự không connected. An toàn kể cả khi device-only completion không hỗ trợ.
- Dọn `folderId`/`DEFAULT_FOLDER`/`setFolderId` khỏi `config.ts` (không còn hằng số tên/ID kho trong logic badge).
> Verify tablet Gú (SM-X710) kho Prod: online → "Đã đồng bộ", mất kết nối → "Chưa thấy mini PC"; QA `gu-library-kho` không hồi quy.

## [1.2.0] — 2026-06-30 — Nav · Sheet thẻ-rời · Button hai bậc · Cài đặt
### Added
- **Cài đặt — Folder kho** hiện đường dẫn đọc-được (`readableTreePath`, vd "Download/kho") thay URI thô; bấm vào = chọn/cấp lại quyền SAF (không gỡ-cài).
- **Cài đặt — Cỡ chữ Viewer** (Vừa/Lớn/Rất lớn = base-scale 1/1.5/2, lưu Preferences): áp cỡ mặc định khi mở tài liệu; **pinch-zoom chồng lên base** (min vẫn fit-width), nhớ-trang không vỡ.
- **Cài đặt — Thông tin máy này**: hiện `deviceId` (khớp tên `_reading-<id>.json`) để đối chiếu reading-state đa máy.
### Changed (kế thừa token v1.1.0, KHÔNG đẻ token mới)
- **Nav:** icon tab Trang chủ → **sách** (`library`); giữ nguyên 4 nhãn chữ.
- **2 sheet ("Đang đọc dở" + "Lưu vào môn nào?") = thẻ-rời:** mỗi item một thẻ giấy ấm bo góc, cách nhau, không che khuất; giữ grabber + title serif. "Đang đọc dở": thẻ mới nhất nâu/kem, còn lại giấy; vuốt-Bỏ + tiến độ "Trang N/M" giữ nguyên; nút **"Bỏ" liền khối** với thẻ.
- **Button hai bậc:** primary = pill đặc nâu/chữ kem (`shape="round"`); secondary (Đóng/Xong) = chữ nâu trơn (`fill="clear"`).
- **`--ion-color-danger` → đỏ-đất** (`#A1402C`) dùng chung pill "Chưa thấy mini PC" + nút "Bỏ" (Title case, `ion-item-option` text-transform none).
> Verify Z Flip 4 (R5CT844VRCN): nav sách + nhãn chữ; sheet thẻ-rời không che khuất, vuốt-Bỏ + tiến độ đúng, "Bỏ" liền khối; button hai bậc; "Bỏ" đỏ-đất khớp pill; folder path đọc-được + chọn lại; cỡ chữ áp đúng + pinch mượt + nhớ-trang; deviceId khớp file.

## [1.1.0] — 2026-06-30 — Pinch-zoom Viewer + đồng nhất UI (token)
### Added
- **Pinch-zoom Viewer:** phóng/thu hai ngón (neo đúng điểm dưới ngón tay, cả dọc lẫn ngang), pan khi đã phóng, double-tap về fit-width; **giữ mức zoom khi lật trang**; không thu dưới fit-width. **Windowing** (chỉ render trang quanh khung nhìn, slot cao cố định theo tỉ lệ thật) → zoom re-raster **nét** mà **không OOM**; điều hướng/nhớ-trang bằng offsets xác định → không trôi. (Còn 1 nhịp re-raster "chớp" nhẹ lúc commit — để dành khử oversample sau.)
### Changed (token layer — giải gốc, không vá rời)
- **Sửa thứ tự CSS:** nạp `@ionic/react/css/*` TRƯỚC `theme/variables.css` (main.tsx) → hết xanh dương rò rỉ (trước đây core.css nạp sau, ghi đè primary nâu về `#3880ff`).
- **`action` = nâu đậm `#553B08`** + chữ kem cho nút đặc; áp đồng loạt mọi nút/icon/back-button.
- **`success` = một shade** (pill sync) cho badge "Đã gửi đi in".
- **Title case toàn app** (`ion-button` text-transform none).
- Tiêu đề sheet "Đang đọc dở" trùng heading Home; nút Gom → "Gom để in (N)" (bỏ `_print/`); căn lề header nhóm môn màn "Đi in".
### Investigation (zoom crash — điều tra trước, fix sau)
- Triệu chứng "pinch → văng app" (3 máy). Logcat: `Render process kill (OOM or update) ... killing application` + `onTrimMemory:40` hàng loạt → **OOM renderer** do render MỌI trang rồi re-raster ở zoom cao. Fix gốc = windowing (giới hạn bộ nhớ). Vị trí trôi (dọc + ngang) do slot cao tự-động + thiếu neo → sửa bằng slot cao cố định + neo offsets/tỉ lệ.
> Verify Z Flip 4 (R5CT844VRCN): hết crash; zoom/double-tap giữ đúng trang + đúng điểm ngón tay (dọc+ngang); lật trang giữ zoom; nhớ-trang đúng; không còn xanh dương; Title case toàn app.

## [1.0.0] — 2026-06-30 — Phase 1 khép trọn: signed release + version hiển thị
### Added
- **APK release có ký** bằng keystore riêng (build CLI `./gradlew assembleRelease`, không Android Studio). Keystore ngoài repo (`~/keystores/gu-library/gu-library-release.jks`, alias `gu-library`), credential ở `android/keystore.properties` (gitignored); `build.gradle` nạp signing từ file đó (vắng file → debug vẫn build).
- **Dòng "Phiên bản X.Y.Z" trong Cài đặt**, đọc tự động từ `package.json` (build.gradle `versionName` ← package.json; Vite `__APP_VERSION__` fallback web; UI qua `App.getInfo()`). Không hardcode.
### Notes
- Mốc **Phase 1 khép trọn** — MVP đủ vòng đời: thêm (Share) → mini PC worker convert/extract → sync 3 máy → xem + nhớ chỗ đọc (đa file, sync) → gom đi in → versioning cứu xóa nhầm.
- ⚠ Mất keystore/mật khẩu = không update được app đã cài. Backup `.jks` + `keystore.properties` (xem README).
> Verify Z Flip 4 (SM-F721B, R5CT844VRCN): APK release ký đúng (CN=Gu Library), cài + chạy lõi (mở môn/PDF/sync) OK, update-over-release `-r` không cần gỡ, Cài đặt hiện "Phiên bản 1.0.0".

## [0.10.0] — 2026-06-30 — M9: Print outbox (mức C) — gom tài liệu đi in
### Added
- **Cờ "cần in" per-file:** tick ở Viewer (header) + dòng tài liệu trong môn → companion `<base>.print.json` cạnh cặp pdf+json (app-owned, Syncthing sync, KHÔNG đụng sidecar). Untick → xóa companion. `classify` bỏ qua `.print.json` + gắn `Document.printFlagged`.
- **Khối "🖨 Đi in (N)" trên Home** giữa "Đang đọc dở" và "Môn học", chỉ hiện khi N≥1 (N = số file cờ "cần in"), cập nhật qua `khoEvents` + foreground resume.
- **Màn "Đi in":** liệt kê file cần in gom theo môn; nút **Gom vào `_print/`** copy (giữ gốc) với tên tiền tố môn `[<môn>] <tên>.pdf` (dedup `(k)` trước đuôi); trạng thái **"đã gửi đi in"** suy từ hiện diện trong `_print/`; tick **"Xong"** xóa file `_print/` + clear cờ. **Vuốt một dòng chưa gom = "Bỏ"** (xóa cờ tại chỗ, khỏi ra môn untick).
- Native `Saf.deleteFile` (DocumentsContract.deleteDocument); `printRepo` (set/clear/scan/gom/markPrinted); `printName` helpers (có test).
- **Khép Phase 1.** Mức A (mini PC tự đẩy `_print/` lên Drive) để Phase 3 — không đập lại C.
> Verify trên Z Flip 4 (SM-F721B, serial R5CT844VRCN): tick/untick/gom/đã-gửi/Xong/vuốt-bỏ + ⏳ không tick được + `.print.json` không lọt danh sách — pass.

## [0.9.0] — 2026-06-29 — M6c: tạo môn + folder con trong app
### Added
- **Tạo môn (cấp 1)** từ nút "+" cạnh "Môn học" ở Home: nhập tên + chọn màu (palette 6 swatch trầm) → folder môn + `_mon.json {color}`. Sort alphabet (không hỏi `order`), "Chưa phân loại" vẫn cuối.
- **Tạo folder con** (mkdir, KHÔNG `_mon.json`) từ nút "+" trong FolderPage, độ sâu bất kỳ.
- Native `Saf.createDir` (chặn trùng, KHÁC `ensureDir` reuse); `repo.createMon`/`createSubfolder`; `validateFolderName` (chặn ký tự cấm `/ \ : * ? " < > |` + rỗng, có test); `CreateFolderModal` (tên + màu tùy chọn, chặn trùng "Đã tồn tại"); palette `MON_PALETTE`.
- Sort trong folder: folder trước, file sau, mỗi nhóm alphabet (vi).
- Refresh ngay qua `khoEvents`. Spike SAF `createDirectory` verify trên máy: tên tiếng Việt + lồng đúng (createDirectory đáng tin, khác createFile). Cũng là spike sống cho M10.

## [0.8.1] — 2026-06-29 — Fix file kẹt `.tmp` trong `_inbox/` (Share Intent)
### Investigation
- Root cause (6 vòng đo logcat+adb): **Samsung SAF ghi FILE THẬT `<tên>.<ext>.tmp` ở tầng filesystem** cho một số ca (pdf/docx/ppt, chập chờn) trong khi MediaStore/`getName()` báo tên sạch → worker (đọc FS thật) thấy `.tmp` → skip → kẹt. KHÔNG phải worker, KHÔNG phải tên nguồn. App qua SAF **không đọc/sửa được tên thật**.
### Fixed (app-side, giảm `.tmp` + sửa lỗi thật)
- `copyToDir` truyền **mime đúng theo đuôi** (không `application/octet-stream`) → pdf/doc/docx/pptx sạch.
- **Dedup `(k)` TRƯỚC đuôi** (`x (1).pdf`) thay vì để Android tự thêm sau đuôi (`x.pdf (1)` — đuôi hỏng, worker bỏ qua).
- **Strip đuôi tạm** (`.tmp/.crdownload/.part/...`) của tên file nguồn share trước khi ghi (`stripTempSuffix`, có test).
### Còn lại → worker (real FS, lưới phổ quát)
- Ca Samsung ghi `.tmp` ở FS mà SAF che mất: **fix ở repo worker** — strip `.tmp` cuối của file app `[<môn>] x.<ext>.tmp`. Spec: `Docs/gu-library-worker-tmp-normalization.md`.

## [0.8.0] — 2026-06-28 — Dedupe "Chưa phân loại" + reading-state đa file & sync
### Changed
- **"Chưa phân loại" gộp một dòng** (folder thật, luôn cuối, icon `?` trầm); bỏ mục ảo. Sheet import cũng chỉ còn một (folder bị lọc khỏi danh sách, giữ nút fallback). `classify` bỏ qua mọi file `_`-prefix.
### Added
- **Reading-state đa tài liệu + sync đa máy (Option D):** mỗi máy ghi `_reading-<deviceId>.json` ở root kho; app render = **union** mọi file (key = đường dẫn tương đối; tombstone last-action-wins → vuốt-xoá/đọc-xong đồng bộ, đọc-lại hiện-lại). Conflict Syncthing = 0. `deviceId` uuid lưu Preferences.
- **Sheet "Đang đọc dở":** card lớn = mới nhất (tap mở đúng trang); tap khu vực → sheet liệt kê đầy đủ (sort mới→cũ), vuốt một dòng = bỏ khỏi danh sách (file/tiến độ giữ nguyên). Vào list khi mở; tự rời khi đọc hết trang.
- Viewer khôi phục trang từ union (đa máy). Migration một lần từ Preferences cũ.
- **Home re-scan khi về foreground** (`@capacitor/app` resume): badge ⏳ + số tài liệu + danh sách đọc dở cập nhật không cần tắt-mở.

## [0.6.3] — 2026-06-21 — Share nhiều file (một lô = một môn)
### Added
- Nhận **ACTION_SEND_MULTIPLE** (intent-filter + MainActivity) → app xuất hiện trong share sheet khi chọn nhiều file. `ShareTargetPlugin` trả danh sách (`getSharedFiles`), `ShareReceiver` copy cả lô vào `_inbox/` với tiền tố môn đã chọn (một môn áp cho toàn lô). File trùng tên gốc tự thêm hậu tố `(1)` (không đè).
### Fixed
- Home cập nhật badge "N chờ" / dòng "Chưa phân loại" **ngay** sau khi import (event `kho-changed`), không phải đợi điều hướng lại tab.

## [0.6.2] — 2026-06-21 — UI "Chưa phân loại" hòa tông + nhất quán
### Changed
- Sheet chọn môn: bỏ nút "CHƯA PHÂN LOẠI" outlined xanh/all-caps (lạc Material). Thay bằng item mờ **xám in nghiêng, title case**, đặt **cuối** danh sách → môn thật là lựa chọn nổi bật (sửa hierarchy ngược).
- Concept "Chưa phân loại" dùng chung visual giữa Home + sheet qua component `UnfiledSwatch` (ô xám viền đứt) — cùng tông + casing.
- Không đụng logic lưu/phân loại/share; badge "Đã đồng bộ" xanh lá giữ nguyên (semantic success).

## [0.6.1] — 2026-06-21 — Sửa môn seed "Aa Dân sự" → "Luật Đất đai"
### Fixed
- Đổi tên môn placeholder seed sai **"Aa Dân sự" → "Luật Đất đai"**. Vì tên môn = tên folder (khóa), migrate an toàn bằng **rename folder** trên đĩa — tài liệu trong môn (`giao-trinh`, `de-cuong.pptx`) giữ nguyên, không tạo môn mới. `_inbox/` không có tiền tố cũ nên không cần migrate prefix.
### Added
- `_mon.json` field tùy chọn **`icon`** (override chữ swatch). "Luật Đất đai" → icon "Đ" + màu xanh `#3F6B2E` để **không trùng** ô icon với "Luật Công chứng" ("L" nâu). Các môn khác vẫn dùng chữ cái đầu mặc định (không phải cơ chế icon tổng quát).
- Fixture (`make-fixture.mjs`) cập nhật theo để khỏi tái tạo placeholder.

## [0.6.0] — 2026-06-21 — M6: Import qua Share Intent
- Share file (PDF/Word/PPTX) từ app khác → Gú's Library → **sheet trượt lên** chọn môn (môn vừa dùng ở đầu) + "Chưa phân loại" → copy vào `_inbox/` tên `[<môn>] <gốc>` (tiền tố = interface M6↔M7).
- Native `ShareTargetPlugin` (ACTION_SEND intent-filter, bắt EXTRA_STREAM cold + warm qua `@capacitor/app` resume); `Saf.copyToDir` copy nhị phân qua content-URI; `Saf.ensureDir`.
- Logic tiền tố thuần (`makeInboxName`/`parseInboxPrefix`, có test). Home gộp ⏳ từ `_inbox/` vào đúng môn; thêm chip "Chưa phân loại — N chờ".
- Nền tảng de-risk bằng 2 spike trên máy thật (SAF ghi + Share Intent) trước khi xây luồng (commit 510f4e8).

## [0.5.1] — 2026-06-20 — Android back navigation
### Fixed
- Android hardware/gesture back nay lùi **một cấp** (folder → cha → Home, viewer → folder) thay vì thoát app. Ở **Home** mới hỏi nhấn back lần nữa ("Nhấn back lần nữa để thoát") rồi thoát — chống thoát nhầm.
- Sửa **double-pop**: `IonTabs` đăng ký `ionBackButton` ở priority 0 (pop một lần + gọi `processNextHandler`), nên handler ở -1 pop lần hai (folder → ông bà, viewer → sai folder). Chuyển handler lên **priority 50** (trên IonTabs, dưới overlay 100/menu 99) → handler của ta là người duy nhất điều hướng.
### Added
- `decideBackAction` (pure, có unit test) + `useAndroidBackButton` hook (gắn `ionBackButton`, overlay-safe) + `BackButtonHandler` mount trong `IonReactRouter`.
- `@capacitor/app`.
> Verify trên SM-S908E (debug build): back chạy đúng, KHÔNG dính bug debug-build #26599 — bỏ qua Task 6 (release diagnostic).

## [0.5.0] — 2026-06-20 — M5: Viewer (xem PDF + nhảy trang)
- Viewer PDF thật (react-pdf / pdf.js, pinned 5.4.296): mở PDF từ kho qua SAF content-URI (`Saf.readFileBase64` → bytes), cuộn nhiều trang, nhảy tới trang N, nhớ + khôi phục trang đang đọc (nối card "đang đọc dở").
- Plugin `Saf.readFileBase64` cho file nhị phân; `src/storage/bytes.ts` + `safFile.ts`; `src/components/PdfView.tsx` (copy buffer tránh detach, theo dõi trang qua IntersectionObserver); `src/pages/ViewerPage.tsx` (header gọn + footer "Trang X / Y" + ô nhảy trang).
- Viewer code-split (lazy) — không nằm trong bundle chính, không vỡ test jsdom.
- Gỡ placeholder viewer + spike. Highlight passage để Phase 2.

## [0.4.2] — 2026-06-20
- Card "đang đọc dở": tên môn (dòng 2) nay được **suy tươi từ docUri lúc render** (không phụ thuộc `monName` đã lưu cũ) — sửa việc card vẫn hiện "Đang đọc" với progress lưu trước bản 0.4.1.

## [0.4.1] — 2026-06-20
### Polish M4 (lệch khỏi spec 9.4, không phải spec sai)
- Bottom nav: mục active đổi sang **nâu** (`#75420E`), inactive xám — bỏ xanh Ionic mặc định.
- Badge "N chờ" (cấp môn) + nhãn chờ xử lý (cấp tài liệu): thay emoji ⏳ bằng **icon vector** (`hourglassOutline`) đồng tông pill.
- Card "đang đọc dở": dòng 2 hiện **tên môn** thật của tài liệu (suy từ SAF tree/document URI) thay cho chữ "Đang đọc".

## [0.4.0] — 2026-06-20 — M4: UI shell (Home lai + điều hướng)
- Home lai (spec 9.4): header serif + đèn sync pill có chữ, ô search lối tắt, MỘT card "đang đọc dở", danh sách môn 1 cột (swatch màu + chữ cái đầu + badge "N chờ"), bottom nav 4 tab.
- Điều hướng môn→chương độ sâu bất kỳ; tài liệu chờ xử lý mờ + nhãn, không mở.
- Theme nâu giấy (CSS variables) + font offline Merriweather/Montserrat.
- Placeholder viewer ghi/khôi phục tiến độ đọc (Viewer thật để M5).
- Launcher icons (panda) qua @capacitor/assets — adaptive + round.
- Fixes lúc nghiệm thu: lọc folder ẩn Syncthing; base64url cho route param SAF; khôi phục đúng trang đang đọc.

## [0.3.0] — 2026-06-20 — M3: Sync status reader (đèn trạng thái)
- Đèn 3 trạng thái (✓ đã đồng bộ / ⟳ đang đẩy / ⚠ chưa thấy mini PC) đọc REST API Syncthing v2 local.
- Native plugin `Syncthing` (HTTPS self-signed localhost-only); Settings nhập API key + chọn mini PC; poll ~10s.

## [0.2.0] — M2: Storage layer & data model
- Native plugin `Saf` (SAF tree access, persistable permission); đọc cây môn/chương độ sâu bất kỳ; `_mon.json` (color/order); nhận diện cặp PDF+JSON; trạng thái chờ xử lý.

## [0.1.0] — M1: Khởi tạo project & toolchain
- App rỗng Capacitor + Ionic React + Vite build APK bằng CLI, cài chạy trên thiết bị Android thật.
