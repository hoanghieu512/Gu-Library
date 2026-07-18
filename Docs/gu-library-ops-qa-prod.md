# Gú's Library — Ghi chú vận hành QA / Prod

*Cập nhật 2026-07-18, trạng thái: app v1.25.1 · worker v0.13.0. **Bản hợp nhất** —
nguồn chân lý duy nhất, phải khớp về cả repo app, repo worker lẫn Obsidian. File này
dành cho huynh (và cả hai CC khi cần dựng lại) — không phải tài liệu cho Gú.*

> **Prod đã có người dùng thật.** Gú đang dùng hằng ngày trên máy của Gú. Mọi thay đổi
> chạm Prod từ đây tính là chạm vào công cụ học của một người thật, không còn là sân tập.

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
| Archive nguồn (v0.10.0 + v0.13.0) | sibling ngoài cây sync | sibling ngoài cây sync |

- Tách ở **cấp cha** (`GuLibrary-Prod\kho`, không phải `kho-prod` cạnh nhau) — cô lập
  `.stversions/`, `_worker.log`, archive; worker trỏ rạch ròi, khó copy nhầm.
- Mini PC = anchor node 24/7 (Syncthing chạy dạng Windows service). Android dùng
  Syncthing-Fork (Catfriend1).

## 3. Worker

- **Một tiến trình, quét tuần tự cả 2 kho** (`-KhoRoot` tách phẩy) — nguyên tắc cứng,
  KHÔNG chạy song song để tránh LibreOffice headless khóa profile.
- Scheduled Task `GuLibraryWorker` mỗi 3 phút, chạy `pythonw` (không cửa sổ).
  Task Scheduler tự lo restart sau reboot — không có daemon để chăm.
- Quan sát: `<kho>\_worker.log` (RotatingFileHandler 1MB×3, `_`-prefix nên app bỏ qua,
  `.stignore` giữ local). **Mỗi kho một log riêng**, mỗi dòng gắn nhãn kho
  (`[GuLibrary]` / `[GuLibrary-Prod]`) — soi Prod vs QA không lẫn. Console không hiện
  gì là **bình thường**.
- File nặng (PDF scan jpx/DPI cao) được chuẩn hóa ~0.8s/trang → một quyển lớn có thể
  kéo một vòng quét dài vài phút, kho còn lại trễ tối đa một vòng, tự lành vòng sau.
  PDF có text layer / scan nhẹ sẵn **KHÔNG** bị chuẩn hóa.
- **Ảnh trong `_inbox/` (v0.12.0):** file ảnh (`.jpg/.jpeg/.png/.webp/.gif/.bmp/.tif/.tiff`)
  → **mỗi ảnh thành một PDF 1 trang riêng**, khổ trang = tỉ lệ ảnh (ảnh ngang → trang
  ngang, không ép dọc), **KHÔNG bao giờ gộp** nhiều ảnh. Nhúng lossless (giữ nét); ảnh
  nặng thì tái dùng chuẩn hóa 150dpi như scan. Ảnh gốc = nguồn đã tiêu thụ (pixel đã nằm
  trong PDF, Gú giữ bản trên điện thoại) → **xóa, KHÔNG archive**. Sidecar ảnh hợp lệ
  nhưng rỗng text (`IMAGE_PAGE_MARKER`, không OCR).
- **Khu archive sibling `…\kho_archive\`** (vd `D:\GuLibrary-Prod\kho_archive\`, ngoài
  Syncthing) giờ giữ hai loại nguồn: (a) bản gốc PDF scan nặng trước chuẩn hóa (v0.10.0),
  (b) gốc `.doc`/`.ppt` (OLE cũ) sau khi convert (v0.13.0 — convert LibreOffice làm sidecar
  degrade về `paragraph`/mất cấu trúc, nên giữ nguồn OOXML để phase 2 re-extract khi làm
  search). Trùng tên → suffix `(n)`, không đè. `.docx`/`.pptx` + PDF gốc + ảnh **KHÔNG**
  vào archive. Dọn tay định kỳ nếu đầy đĩa, không có gì tự xóa.
- **Hai task hạ tầng riêng (v0.11.0 — ĐANG CHẠY, độc lập với `GuLibraryWorker`, chết
  độc lập):** `GuLibraryPrintSync` (mirror `_print/` Prod → `gdrive:GuLibrary/Di-in`
  mỗi ~15 phút) và `GuLibraryBackup` (CN 03:00 — robocopy snapshot → `rclone sync` lên
  `gdrive:GuLibrary/Backup`). Register bằng `scripts\register-ops-tasks.ps1` (Admin).
  Log riêng, **NGOÀI kho**: `D:\GuLibrary-Prod\_print-sync.log` và `_backup.log`. rclone
  cài user-scope (winget), remote tên `gdrive`, config OAuth ở `%APPDATA%\rclone\rclone.conf`.
- **Cả 3 Scheduled Task chạy principal S4U** (run-whether-logged-on-or-not) → sống lại
  sau reboot **không cần ai logon**, và headless (session 0, không cửa sổ). Đây chính là
  cái làm "reboot tự dậy" ở §4/§6 thành sự thật. Đổi/thêm task phải giữ S4U; các
  register script đã set sẵn.

## 4. Dựng máy mới vào cụm (hoặc dựng lại từ đầu) — 6 bước

1. **Folder:** trên mini PC, tạo (hoặc xác nhận) folder kho đúng cấp cha riêng
   (`D:\GuLibrary\kho` hay `D:\GuLibrary-Prod\kho`).
2. **Syncthing mini PC:** Add Folder với folder-ID đúng bảng trên; kiểm `.stversions`
   (simple versioning) bật — đây là lưới M8.
3. **Máy Android mới:** cài Syncthing-Fork → trao đổi device-ID với mini PC → share
   ĐÚNG MỘT folder (QA hoặc Prod, không bao giờ cả hai) → chờ sync xong lượt đầu.
4. **Worker:** *(mini PC mới — dựng môi trường trước:* cài Python 3.11+ và LibreOffice,
   `git clone` repo worker, `python -m venv .venv` rồi `.venv\Scripts\python -m pip install
   -e .`; soffice auto-detect nên không cần sửa PATH — chi tiết README worker.*)*
   Nếu là kho mới, thêm đường dẫn vào `-KhoRoot` (tách phẩy) của Scheduled
   Task; chạy `scripts\register-task.ps1` (Admin) và **tin vào bước verify của nó** (nó tự
   `Get-ScheduledTask` kiểm trước khi báo thành công — bài học v0.7.9 báo-thành-công-giả).
   **Nếu dựng lại Prod** cần thêm 2 task hạ tầng: cài rclone + `rclone config` (remote
   `gdrive`, OAuth — xem README worker mục "Prod ops") rồi
   `scripts\register-ops-tasks.ps1 -KhoRoot "D:\GuLibrary-Prod\kho" -RcloneRemote "gdrive"` (Admin).
5. **App (dựng + cài APK release, làm trên máy Mac):** bump version = sửa **1 chỗ**
   `versionName` trong `package.json` (`versionCode` tĩnh =2 ở build.gradle — không tăng,
   sideload không cần). Dựng: `cd android && ./gradlew assembleRelease` →
   `app/build/outputs/apk/release/Gu-Library-<ver>-release.apk`. Keystore ngoài repo
   `~/keystores/gu-library/gu-library-release.jks`, credential `android/keystore.properties`
   (gitignored). Cài lên máy: release-đè-release **cùng keystore** không mất data;
   release-**đè-debug phải gỡ trước** (khác chữ ký → `install -r` báo lỗi). Rồi Cài đặt →
   Folder kho → chọn đúng folder qua SAF; kiểm badge "Đã đồng bộ" (dựa connected của
   device mini PC, không dựa tên kho).
6. **Smoke:** bỏ 1 file PDF qua đường Share vào một môn → thấy ⏳ → chờ vòng worker →
   thành tài liệu mở được. Thông chuỗi này = môi trường sống.

## 5. Backup & điểm không được mất

- **Keystore `gu-library-release.jks` + `keystore.properties`** = single point of no
  return. Mất là hết đường update app đã cài. Phải có bản ngoài máy Mac
  (cloud/USB/password manager) — kiểm lại định kỳ.
- **Schema sidecar** phải khớp thủ công ở **3 nơi**: repo app, repo worker, và tài liệu
  Obsidian. Không có cơ chế tự đồng bộ. Lệch một nơi = hỏng hợp đồng dữ liệu dài hạn,
  và sidecar là hợp đồng phục vụ cả những feature Phase 2 chưa viết. Sửa schema ở đâu
  thì phải sửa đủ ba, ngay trong cùng session.
  **Bản chốt phía worker: `Docs/gu-library-sidecar-schema.md`;** `validate_sidecar` kiểm
  đúng theo đó, gồm cả `bbox` (optional) và `IMAGE_PAGE_MARKER` cho PDF-ảnh. Nếu doc bên
  app mô tả sidecar, phải khớp đúng hai field này.
- **Kho Prod — chuỗi backup đang chạy (v0.11.0):** hàng tuần robocopy snapshot theo ngày
  vào `D:\GuLibrary-Prod\backup\` (giữ 4 bản gần nhất; snapshot **loại `.stversions`** cho
  gọn — chiều sâu thời gian là các bản-ngày, không phải version-history của Syncthing) →
  xong `rclone sync` folder backup lên Drive `GuLibrary/Backup` (offsite thật, vá ca
  mất-cả-cụm). Lưu ý trung thực: ransomware mã hóa local rồi nhịp sync kế chạy thì bản
  Drive bị đè theo, nhưng Drive trash + version history ~30 ngày vẫn là cửa lùi cuối.
  Mức này chấp nhận đủ.
- **`_print/` (Prod) → Drive `GuLibrary/Di-in`, mirror mỗi ~15 phút** (chính là M9
  mức A, về sớm không cần đụng app/worker): folder Drive luôn = hàng đợi cần in hiện
  tại — Gú tick "Xong" là file rời cả Drive; share link viewer cho người in một lần
  là xong vĩnh viễn.
- `_reading-<deviceId>.json`, `.print.json` sống trong kho nên đi theo backup kho,
  không cần lo riêng.

## 6. Khi có biến — checklist chẩn đoán nhanh

- **App báo "Chưa thấy mini PC":** kiểm Syncthing mini PC đang chạy (service) + máy đó
  connected trong Syncthing UI. Từ v1.2.1 badge chỉ sai khi device thật sự mất kết nối.
- **App (Cài đặt) hiện version cũ sau khi update:** `versionName` được **nướng vào APK
  lúc build** (build.gradle đọc `package.json`), không đọc runtime → cài lại một APK dựng
  *trước* lúc bump sẽ vẫn hiện số cũ dù code mới. Không phải bug: dựng LẠI `assembleRelease`
  sau khi bump rồi cài đè (đã gặp thật v1.16.0→v1.17.0).
- **File kẹt ⏳ lâu:** mở `<kho>\_worker.log`. File đuôi lạ/tmp kẹt lại là *tín hiệu
  dọn tay theo thiết kế*, worker không tự xóa. Segment tiền tố độc → worker route về
  "Chưa phân loại" + WARNING trong log.
- **Ảnh (jpg/jpeg/png/webp) kẹt ⏳ không thành PDF:** app **nhận ảnh từ v1.19.0** (picker
  "Chọn file từ máy" + share từ Gallery), nhưng đóng ảnh→PDF là việc của **worker**. Env
  nào app nhận ảnh thì worker env đó **PHẢI biết xử ảnh TRƯỚC**, không thì ảnh nằm ⏳ vô
  hạn. Thứ tự deploy bắt buộc: worker-image lên Prod trước → verify → rồi mới đẩy app
  v1.19.0 sang máy Gú. **Lệch whitelist có chủ ý:** app CHỈ gửi `jpg/jpeg/png/webp`;
  worker (v0.12.0) xử được TẬP RỘNG hơn (thêm `gif/bmp/tif/tiff`) nhưng app cố tình chưa
  mở các loại đó (chọn hẹp cho chắc) → không phải bug. HEIC thì **cả app lẫn worker đều
  không nhận** (Samsung để "high efficiency" mới ra HEIC — Gú giữ JPG là an toàn). Cần
  nhập gif/bmp/tif thì chỉ việc nới whitelist app (worker sẵn sàng) — beat nhỏ.
- **Thấy folder `_inbox (1)`, `_inbox (2)`… ở gốc kho, hoặc danh sách môn RỖNG dù kho
  đầy:** đã gặp thật (2026-07-13, Flip 4, khi nhập nhiều ảnh liên tiếp). Gốc: `_inbox` bị
  worker/Syncthing xóa+tạo lại giữa loạt import → cache SAF stale → app tạo trùng
  `_inbox (k)`; snapshot cũ coi `_inbox (k)` là môn rồi throw → **môn hiển thị rỗng —
  DATA KHÔNG MẤT** (folder môn còn nguyên trên đĩa). **Đã fix ở app v1.19.0** (ensureDir
  dò cursor tươi + tự lành dedup; snapshot lọc `_`-prefix + try/catch từng môn) → không
  còn tái sinh `_inbox (k)`. Nếu môn vẫn rỗng sau churn cực đoan: DocumentsProvider của
  OS kẹt index tạm thời → **reboot máy** dọn (data còn nguyên). File trong `_inbox (k)`
  mồ côi (máy chưa lên v1.19.0) — worker chỉ quét `_inbox` → **dồn tay về `_inbox` rồi
  xóa folder rác** (giữ nguyên tiền tố `[Môn]`).
- **Thấy folder `<tên>-gu-case-<số>` ở trong môn/thư mục:** residue rất hiếm của đổi
  tên case-only (v1.25.1 đổi 2 bước qua tên tạm để né `(1)` — xem CHANGELOG). Chỉ đọng
  nếu app bị kill GIỮA hai bước rename. An toàn: đổi tên tay folder đó về tên đích (bỏ
  đuôi `-gu-case-<số>`). Không mất data — con bên trong còn nguyên.
- **Đổi tên môn/thư mục ra `… (1)`:** đã fix ở app v1.25.1 (đổi tên sang biến thể chỉ
  khác hoa/thường của chính nó). Nếu còn thấy `(1)` sau đổi tên → máy đó chưa lên v1.25.1.
- **Sync đứng, thấy file mồ côi `.syncthing.*.tmp`:** đã gặp thật trên Flip 4.
  **Không phải bug app/worker, không có fix code.** Syncthing tự hòa giải sau vài vòng.
  Chỉ theo dõi xem có tái diễn thành mẫu hình lặp lại hay không; nếu chỉ lẻ tẻ thì bỏ qua.
- **Nghi hai kho lẫn nhau:** kiểm từng máy Android chỉ share đúng 1 folder-ID;
  kiểm `-KhoRoot` của task đúng 2 đường dẫn.
- **Mini PC vừa reboot:** không phải làm gì — service Syncthing + Scheduled Task (S4U)
  tự dậy. Chỉ kiểm nếu 15 phút sau file vẫn kẹt.
- **Nghi rclone chết:** hai task hạ tầng chết độc lập với worker — worker chạy ngon
  không nói lên rclone còn sống. Kiểm `D:\GuLibrary-Prod\_print-sync.log` / `_backup.log`
  và `Get-ScheduledTask GuLibraryPrintSync,GuLibraryBackup | Get-ScheduledTaskInfo |
  Select State,LastTaskResult` (LastTaskResult `0` = OK). Test auth tay: `rclone lsd gdrive:`.

## 7. Mô hình test cuốn chiếu (đã chốt 2026-07-03)

- **Giữ song song dài hạn, QA chạy trước Prod một phase:** vd Phase 2 phát triển/test
  trên QA (3 máy test) trong khi Prod của Gú vẫn ở Phase 1 ổn định. Chỉ khi phase mới
  chín trên QA mới đẩy sang Prod.
- Hệ quả: 3 máy test không gập lại trong tương lai gần.
- **Ràng buộc sống còn (giờ đã có hiệu lực thật):** máy Gú đang chạy Prod hằng ngày →
  **APK thử nghiệm tuyệt đối không sideload sang máy Gú.** Máy Gú chỉ nhận bản đã
  nghiệm thu đủ hai máy test.

## 8. Trạng thái mốc & việc còn treo

- App **v1.25.1** trên main, sạch, chỉ còn nhánh `main` (tag `v1.25.1` đã push). Từ v1.19.0
  đến nay là **polish UI/UX thuần, KHÔNG coupling worker/hạ tầng mới** — deploy độc lập, không
  chờ worker: v1.20 breadcrumb bấm-nhảy-tầng · v1.21 ô nhập floating-label tự-vẽ (đồng nhất mọi
  WebView) · **M10 folder-level ĐÓNG TRỌN**: v1.22 đổi tên + v1.23 xóa môn/thư mục (đệ quy, chặn
  pending) + v1.23.1 empty-state panda khi thư mục bị máy khác xóa + v1.25.1 fix đổi-tên case-only
  ra `(1)` · v1.24 định vị cây sâu (phụ đề "Đang đọc dở" rút gọn `…` + avatar ô-màu-thuần) ·
  v1.25.0 toast phản hồi cho MỌI thao tác đơn (giọng Gú). **Nav chữ-bên-icon = won't-do (đóng sổ).**
  **v1.19.0 image-coupling ĐÃ GIẢI:** worker Prod v0.13.0 xử ảnh→PDF từ v0.12.0 → app nhận-ảnh lên
  Prod được. *Bản APK thực trên tablet Gú (Prod): huynh xác nhận đang ở version nào — doc không tự suy.*
- Worker **v0.13.0** — hai task rclone đã triển khai và đang chạy; OAuth Drive đã setup.
  **Không còn nợ hạ tầng.** Beat gần đây: ảnh→PDF 1 trang (v0.12.0), archive gốc
  `.doc`/`.ppt` thay vì xóa (v0.13.0). Nợ Phase 2 đã đặt cọc: re-extract cấu trúc từ
  các nguồn `.doc`/`.ppt` đã archive (làm cùng lúc thiết kế search).
- Backlog cũ (M10 folder-level, breadcrumb, nav chữ-bên-icon) đã **giải quyết xong** (M10 +
  breadcrumb đã làm; nav = won't-do). **Không còn backlog feature Phase 1 mở.** Nguyên tắc giữ
  nguyên: không mở beat mới cho tới khi có vấn đề quan sát được từ người dùng thật — không suy
  diễn nhu cầu. (Các beat v1.20→v1.25 vừa qua đều xuất phát từ feedback thật của Gú khi dùng.)
