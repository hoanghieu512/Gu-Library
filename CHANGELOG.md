# Changelog

Theo [Semantic Versioning](https://semver.org/). Mỗi milestone Phase 1 = một minor; polish/sửa lỗi = patch.

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
