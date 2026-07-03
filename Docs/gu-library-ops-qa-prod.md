# Gú's Library — Ghi chú vận hành QA / Prod

*Trả nợ từ session v1.0.0 ("nâng đoạn dán tạm thành ghi chú đầy đủ"). Cập nhật 2026-07-03,
trạng thái: app v1.4.0 · worker v0.10.0. File này dành cho huynh (và CC mini PC khi cần
dựng lại) — không phải tài liệu cho Gú.*

## 1. Nguyên tắc gốc

- App local-first, không backend → **"môi trường" = folder kho nào + cụm Syncthing nào**,
  không phải tầng app. Không có build flavor riêng — cùng một APK chạy cả QA lẫn Prod,
  khác nhau duy nhất ở folder kho được chọn trong Cài đặt.
- App **agnostic tên/ID kho** từ v1.2.1 (badge query theo device, đã xóa hằng số kho cứng).
  Mọi cấu hình môi trường nằm ở Syncthing + worker, không nằm trong code app.
- **Không share chéo** hai kho: máy test không thấy kho Prod, máy Gú không thấy kho QA.

## 2. Sơ đồ hiện trạng

| | QA | Prod |
|---|---|---|
| Folder trên mini PC | `D:\GuLibrary\kho` | `D:\GuLibrary-Prod\kho` |
| Folder-ID Syncthing | `gu-library-kho` | `gu-library-kho-prod` |
| Máy trong cụm | Z Flip 4 · S22 Ultra · Z Fold 3 (máy test) | Galaxy Tab S9 (SM-X710) · S20 FE · Z Flip 6 (máy Gú) |
| Archive chuẩn hóa (v0.10.0) | sibling ngoài cây sync | sibling ngoài cây sync |

- Tách ở **cấp cha** (`GuLibrary-Prod\kho`, không phải `kho-prod` cạnh nhau) — cô lập
  `.stversions/`, `_worker.log`, archive; worker trỏ rạch ròi, khó copy nhầm.
- Mini PC = anchor node 24/7 (Syncthing chạy dạng Windows service). Android dùng
  Syncthing-Fork (Catfriend1).

## 3. Worker

- **Một tiến trình, quét tuần tự cả 2 kho** (`-KhoRoot` tách phẩy) — nguyên tắc cứng,
  KHÔNG chạy song song để tránh LibreOffice headless khóa profile.
- Scheduled Task `GuLibraryWorker` mỗi 3 phút, chạy `pythonw` (không cửa sổ).
  Task Scheduler tự lo restart sau reboot — không có daemon để chăm.
- Quan sát duy nhất: `<kho>\_worker.log` (RotatingFileHandler 1MB×3, `_`-prefix nên app
  bỏ qua, `.stignore` giữ local). Console không hiện gì là **bình thường**.
- File nặng (PDF scan jpx/DPI cao) được chuẩn hóa ~0.8s/trang → một quyển lớn có thể
  kéo một vòng quét dài vài phút, kho còn lại trễ tối đa một vòng, tự lành vòng sau.
- Bản gốc trước chuẩn hóa nằm ở folder archive sibling (ngoài Syncthing) — dọn tay
  định kỳ nếu đầy đĩa, không có gì tự xóa.
- **Hai task hạ tầng riêng (v0.11.0, độc lập với `GuLibraryWorker`, chết độc lập):**
  (1) mirror `_print/` Prod → Drive mỗi ~15 phút; (2) chuỗi backup tuần
  (robocopy snapshot → rclone lên Drive). Đều headless qua rclone, không cần logon;
  log riêng từng task.

## 4. Dựng máy mới vào cụm (hoặc dựng lại từ đầu) — 6 bước

1. **Folder:** trên mini PC, tạo (hoặc xác nhận) folder kho đúng cấp cha riêng
   (`D:\GuLibrary\kho` hay `D:\GuLibrary-Prod\kho`).
2. **Syncthing mini PC:** Add Folder với folder-ID đúng bảng trên; kiểm `.stversions`
   (simple versioning) bật — đây là lưới M8.
3. **Máy Android mới:** cài Syncthing-Fork → trao đổi device-ID với mini PC → share
   ĐÚNG MỘT folder (QA hoặc Prod, không bao giờ cả hai) → chờ sync xong lượt đầu.
4. **Worker:** nếu là kho mới, thêm đường dẫn vào `-KhoRoot` (tách phẩy) của Scheduled
   Task; chạy script register-task và **tin vào bước verify của nó** (nó tự
   `Get-ScheduledTask` kiểm trước khi báo thành công — bài học v0.7.9 báo-thành-công-giả).
5. **App:** cài APK release (cùng keystore — cài đè không mất data); Cài đặt → Folder kho
   → chọn đúng folder qua SAF; kiểm badge "Đã đồng bộ" (giờ dựa connected của device
   mini PC, không dựa tên kho).
6. **Smoke:** bỏ 1 file PDF qua đường Share vào một môn → thấy ⏳ → chờ vòng worker →
   thành tài liệu mở được. Thông chuỗi này = môi trường sống.

## 5. Backup & điểm không được mất

- **Keystore `gu-library-release.jks` + `keystore.properties`** = single point of no
  return. Mất là hết đường update app đã cài. Phải có bản ngoài máy Mac
  (cloud/USB/password manager) — kiểm lại định kỳ.
- **Kho Prod — chuỗi backup đã chốt (v0.11.0):** hàng tuần robocopy snapshot theo ngày
  vào `D:\GuLibrary-Prod\backup\` (giữ 4 bản gần nhất) → xong `rclone sync` folder backup
  lên Drive `GuLibrary/Backup` (offsite thật, vá ca mất-cả-cụm). Lưu ý trung thực:
  ransomware mã hóa local rồi nhịp sync kế chạy thì bản Drive bị đè theo, nhưng Drive
  trash + version history ~30 ngày vẫn là cửa lùi cuối. Mức này chấp nhận đủ.
- **`_print/` (Prod) → Drive `GuLibrary/Di-in`, mirror mỗi ~15 phút** (chính là M9
  mức A, về sớm không cần đụng app/worker): folder Drive luôn = hàng đợi cần in hiện
  tại — Gú tick "Xong" là file rời cả Drive; share link viewer cho người in một lần
  là xong vĩnh viễn.
- `_reading-<deviceId>.json`, `.print.json` sống trong kho nên đi theo backup kho,
  không cần lo riêng.

## 6. Khi có biến — checklist chẩn đoán nhanh

- **App báo "Chưa thấy mini PC":** kiểm Syncthing mini PC đang chạy (service) + máy đó
  connected trong Syncthing UI. Từ v1.2.1 badge chỉ sai khi device thật sự mất kết nối.
- **File kẹt ⏳ lâu:** mở `<kho>\_worker.log`. File đuôi lạ/tmp kẹt lại là *tín hiệu
  dọn tay theo thiết kế*, worker không tự xóa. Segment tiền tố độc → worker route về
  "Chưa phân loại" + WARNING trong log.
- **Nghi hai kho lẫn nhau:** kiểm từng máy Android chỉ share đúng 1 folder-ID;
  kiểm `-KhoRoot` của task đúng 2 đường dẫn.
- **Mini PC vừa reboot:** không phải làm gì — service Syncthing + Scheduled Task tự dậy.
  Chỉ kiểm nếu 15 phút sau file vẫn kẹt.

## 7. Mô hình test cuốn chiếu (đã chốt 2026-07-03)

- **Giữ song song dài hạn, QA chạy trước Prod một phase:** vd Phase 2 phát triển/test
  trên QA (3 máy test) trong khi Prod của Gú vẫn ở Phase 1 ổn định. Chỉ khi phase mới
  chín trên QA mới đẩy sang Prod.
- Hệ quả: 3 máy test không gập lại trong tương lai gần; mọi APK thử nghiệm chỉ sideload
  máy test, máy Gú chỉ nhận bản đã nghiệm thu.

## 8. Việc còn treo (quyết sau)

- Triển khai v0.11.0 (hai task rclone) — thiết kế đã chốt 2026-07-03, chờ CC mini PC
  thực thi; việc tay một lần của huynh: setup OAuth rclone với tài khoản Drive.
