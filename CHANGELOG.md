# Changelog

Theo [Semantic Versioning](https://semver.org/). Mỗi milestone Phase 1 = một minor; polish/sửa lỗi = patch.

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
