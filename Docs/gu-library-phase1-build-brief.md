# Gú's Library — Build Brief: Phase 1 (MVP)

> **Mục đích file này:** đầu vào cho `writing-plans` chạy *trong Claude Code* (nơi có repo thật). File chỉ mô tả **mục tiêu + kết quả mong muốn + nghiệm thu** cho từng milestone, KHÔNG chứa code. Claude Code sẽ tự bung thành plan chi tiết (TDD, exact path) dựa trên codebase thực tế.
> **Đọc kèm:** `gu-library-design-spec.md` (spec đầy đủ — kiến trúc, lý do, ranh giới module).

---

## 0. Nguyên tắc chung khi build

- **Local-first, offline-first:** mỗi tính năng phải chạy được không cần mạng.
- **TDD + commit thường + DRY + YAGNI.**
- **Hai nơi chạy, tách bạch:**
  - **App Android** — Capacitor + Ionic + React + Vite, build bằng CLI (không Android Studio).
  - **Mini PC worker** — script chạy 24/7, watch `_inbox/`, convert + extract. KHÔNG nằm trong app.
- **Sợi chỉ xuyên suốt (quan trọng nhất):** sidecar JSON sinh ở Phase 1 **phải chứa sẵn** text + cấu trúc Điều/Khoản/Điểm + vị trí trang — dù Search/Cross-link là Phase 2. Thiếu là Phase 2 phải làm lại cả kho.

---

## Thứ tự build (theo phụ thuộc)

Nền kỹ thuật → dữ liệu → đồng bộ → giao diện → xem → nhập → xưởng mini PC → backup → đường ra đi in.

---

### M1 — Khởi tạo project & toolchain
**Mục tiêu:** dựng được bộ khung build ra APK cài lên máy, không cần Android Studio.
**Kết quả mong muốn:** một app rỗng (Capacitor + Ionic + React + Vite) build bằng CLI, cài và mở được trên thiết bị Android thật.
**Ràng buộc đã chốt:** UI framework = Ionic + React; build CLI bằng Android SDK command-line tools + Gradle + JDK.
**Nghiệm thu:**
- [ ] Lệnh build CLI ra file APK thành công, không mở Android Studio.
- [ ] APK cài và khởi động trên 1 thiết bị Android thật.

---

### M2 — Storage layer & data model
**Mục tiêu:** app đọc/hiểu được cấu trúc kho dạng folder.
**Kết quả mong muốn:** app xin được quyền truy cập folder kho (scoped storage), đọc cấu trúc *folder = môn (cấp 1) → lồng tự do*, đọc metadata phân tán (`_mon.json`), nhận diện cặp `.pdf` + `.json` là một tài liệu, và nhận ra tài liệu "chờ xử lý" (chỉ có file gốc, chưa có PDF/sidecar).
**Ràng buộc đã chốt:** metadata phân tán, không file manifest trung tâm; điều hướng phải xử lý độ sâu bất kỳ; index search là derived — KHÔNG đụng ở Phase 1 ngoài việc chừa chỗ. Schema `_mon.json` = **tên hiển thị lấy từ folder name**, `_mon.json` chỉ giữ `color` + `order` (cả hai tùy chọn) — spec 4.1b.
**Rủi ro / điểm cần thử nghiệm:**
- **SAF/scoped storage (spike đầu tiên):** folder kho nằm ngoài sandbox app (folder Syncthing ở shared storage). Capacitor Filesystem không đọc folder tùy ý — cần SAF: người dùng chọn folder kho một lần qua document picker, app **giữ persistable URI permission** qua đóng/mở app. **Mở M2 bằng PoC nhỏ** (chọn folder → liệt kê con → giữ được quyền sau restart) trên máy thật TRƯỚC khi xây storage layer đầy đủ. Cùng nhóm spike với highlight PDF (M5) và ghi `_print/` (M9).
**Kho mẫu (fixture):** plan M2 tự dựng một kho mẫu nhiều tầng (Môn → Chương → Buổi), có `_mon.json`, và **có cả tài liệu "chờ xử lý"** (chỉ file gốc) để test phân biệt — KHÔNG test bằng kho thật của Gú.
**Nghiệm thu:**
- [ ] PoC SAF: chọn folder kho → app giữ được quyền truy cập sau khi đóng/mở lại app.
- [ ] App liệt kê đúng cây môn/chương từ một kho mẫu nhiều tầng.
- [ ] Tên môn hiển thị đúng từ folder name (kể cả tên tiếng Việt có dấu); đọc đúng màu/thứ tự từ `_mon.json` khi có, dùng mặc định khi thiếu.
- [ ] Phân biệt đúng: tài liệu đã xử lý (có PDF+JSON) vs chờ xử lý (chỉ gốc).

---

### M3 — Sync status reader (đèn trạng thái)
**Mục tiêu:** cho người dùng biết "đã an toàn đổi máy chưa".
**Kết quả mong muốn:** app đọc API trạng thái Syncthing trên chính máy đó và hiện 1 trong 3 trạng thái ở góc phải header: ✓ đã đẩy hết lên mini PC / ⟳ đang đẩy / ⚠ chưa thấy mini PC.
**Ràng buộc đã chốt:** mốc là "máy này đã đẩy hết lên mini PC chưa", KHÔNG cố báo "cả 3 máy giống nhau chưa"; không có nút "Sync now" (đèn chỉ để yên tâm). Syncthing cài/cấu hình ngoài app.
**Nghiệm thu:**
- [ ] Còn file đang truyền lên mini PC → hiện ⟳.
- [ ] Hết file chờ + thấy mini PC → hiện ✓.
- [ ] Ngắt mạng / mini PC tắt → hiện ⚠.

---

### M4 — UI shell (Home lai + điều hướng)
**Mục tiêu:** bộ mặt app, mở ra dùng được ngay với ít thao tác.
**Kết quả mong muốn:** màn Home lai gồm (theo thứ tự) header + đèn sync, ô search (lối tắt), card "Đang đọc dở" (0 chạm để đọc tiếp, có tiến độ trang), danh sách môn (số tài liệu + badge ⏳ nếu có file chờ), bottom nav Trang chủ/Tìm/Thêm/Cài đặt. Điều hướng vào môn → chương → … bằng breadcrumb độ sâu bất kỳ.
**Ràng buộc đã chốt:** tông nâu giấy (palette + cặp font sans/serif ở spec mục 9.3); serif cho phần nội dung/tiêu đề đọc; lấy cảm hứng thẩm mỹ Goodreads-redesign, KHÔNG bê chức năng xã hội; badge ⏳ hiện ở cả cấp môn và cấp tài liệu.
**Nghiệm thu:**
- [ ] Home hiện đúng card "đang đọc dở" và danh sách môn từ kho mẫu.
- [ ] Bấm card đang đọc dở → mở đúng tài liệu, đúng trang dừng.
- [ ] Điều hướng được vào môn lồng nhiều tầng, breadcrumb đúng.
- [ ] Tài liệu chờ xử lý hiện mờ + nhãn ⏳, không bấm xem được.

---

### M5 — Viewer (xem PDF + nhảy trang)
**Mục tiêu:** xem tài liệu, đồng nhất một đường PDF.
**Kết quả mong muốn:** mở PDF, cuộn đọc, nhảy tới trang cụ thể, nhớ trang đang đọc (phục vụ "đang đọc dở"). Slide PPTX đã thành PDF nên dùng chung Viewer.
**Ràng buộc đã chốt:** highlight đúng đoạn khi nhảy tới là điểm *cần thử nghiệm* — Phase 1 chỉ cần nhảy đúng trang; highlight overlay có thể để thử riêng, không chặn MVP.
**Nghiệm thu:**
- [ ] Mở và cuộn được PDF nhiều trang mượt.
- [ ] Nhảy thẳng tới trang N theo lệnh.
- [ ] Ghi nhớ và khôi phục đúng trang đang đọc.

---

### M6 — Import qua Share Intent
**Mục tiêu:** thêm tài liệu với ít thao tác nhất.
**Kết quả mong muốn:** từ trình duyệt/Files, Share một file (PDF/Word/PPTX) → Gú's Library → app hỏi chọn môn ngay (gợi ý môn vừa dùng) + nút "Chưa phân loại" → file gốc rơi vào `_inbox/` để Syncthing đẩy lên mini PC. Tài liệu hiện trạng thái ⏳ cho tới khi mini PC xử lý xong.
**Ràng buộc đã chốt:** Share Intent là đường chính; watch-folder (copy vào `_inbox/` từ máy tính) là đường phụ; nút "+" trong app là dự phòng.
**Nghiệm thu:**
- [ ] Share file từ app khác vào → chọn môn → file nằm đúng trong `_inbox/`.
- [ ] Tài liệu vừa thêm hiện ⏳ ở đúng môn.
- [ ] Chọn "Chưa phân loại" cũng lưu được, không kẹt luồng.

---

### M7 — Mini PC worker (convert + extract) — *chạy trên mini PC, không phải app*
**Mục tiêu:** biến file gốc thành cặp PDF + sidecar chuẩn.
**Kết quả mong muốn:** worker watch `_inbox/`; mỗi file gốc → (1) convert sang PDF bằng LibreOffice headless, (2) extract sidecar từ *file gốc* gồm text đầy đủ + cấu trúc Điều/Khoản/Điểm + vị trí trang, (3) đặt cặp `.pdf` + `.json` vào đúng môn, (4) bỏ file gốc. Syncthing rải về 3 máy.
**Ràng buộc đã chốt:** lớp rút text thống nhất (đầu đọc PDF/PPTX/Word → cùng một output: text + vị trí + cấu trúc); sidecar PHẢI có sẵn cấu trúc Điều/Khoản cho Phase 2; PDF chỉ để xem, sidecar để hiểu.
**Nghiệm thu:**
- [ ] Bỏ 1 file Word luật vào `_inbox/` → ra PDF + JSON đúng môn, gốc bị xóa.
- [ ] Bỏ 1 file PPTX → ra PDF + JSON, text theo từng slide + vị trí.
- [ ] Sidecar của văn bản luật chứa đúng ranh giới + nhãn Điều/Khoản và trang tương ứng.

---

### M8 — Backup (versioning Syncthing) — *cấu hình mini PC*
**Mục tiêu:** chống xóa nhầm lan truyền (rủi ro thật, không phải hỏng ổ).
**Kết quả mong muốn:** bật versioning của Syncthing trên mini PC để giữ bản cũ của file bị xóa/sửa (vd 30 ngày), khôi phục lại được khi lỡ tay.
**Ràng buộc đã chốt:** đây là cấu hình Syncthing, không phải code app; off-site Drive là tùy chọn Phase 3.
**Nghiệm thu:**
- [ ] Xóa một file trong kho → sau khi sync, bản cũ vẫn moi lại được từ versioning trên mini PC.

---

### M9 — Đường ra đi in (Print outbox, mức C) — *một phần app, một phần thao tác tay*
**Mục tiêu:** xoá lỗi gốc "copy tay từng file đi in dễ sai" — app gom hộ + đặt tên sạch, người chỉ kéo một phát lên Drive.
**Kết quả mong muốn:** trong khi đọc/duyệt, đánh dấu được tài liệu **"cần in"** (cờ này thấy trên cả 3 máy). Một hành động gom: app copy mọi tài liệu "cần in" vào `_print/` trong kho, tên gắn tiền tố môn để không trùng, bản gốc trong môn giữ nguyên. Tài liệu đã nằm trong `_print/` hiện trạng thái **"đã gửi đi in"** (suy ra từ filesystem, không lưu state riêng). Sau khi in xong, tick **"xong"** → app xoá file khỏi `_print/` + clear cờ "cần in". Việc kéo `_print/` lên folder Drive "in" là thao tác tay của Gú ở PC (mức C chưa code Drive).
**Ràng buộc đã chốt:**
- Cờ "cần in" là metadata app-owned **per-file**, **có sync**, **KHÔNG ghi vào sidecar** (sidecar thuộc mini PC) — giữ nguyên tắc "nhiều file nhỏ, không file tập trung bị nhiều máy ghi" (spec 14.4).
- "Đã gửi đi in" **derive từ sự hiện diện trong `_print/`**, không tạo state thứ hai cho cùng một sự thật.
- Gom = copy (giữ gốc); tên trong `_print/` có tiền tố môn chống trùng.
- KHÔNG có trạng thái "đang in"; "xong" là dọn thủ công.
- Mức C **chưa** đụng Drive auth — Drive vẫn là việc tay; chân Drive tự động để dành mức A (Phase 3).
**Rủi ro / điểm cần thử nghiệm:**
- **Scoped storage phần GHI:** M2 mới validate quyền *đọc* cây kho; M9 cần app *copy/ghi/xoá* file trong kho (`_print/`). Xếp cùng nhóm "cần thử nghiệm" như highlight PDF (spec 6, 14.1) — phải kiểm chứng Capacitor filesystem + SAF ghi được trong folder kho đã cấp quyền.
**Nghiệm thu:**
- [ ] Tick "cần in" ở 1 máy → cờ hiện đúng sau khi sync ở máy khác.
- [ ] Gom → file xuất hiện trong `_print/`, tên có tiền tố môn, không trùng khi 2 môn có file trùng tên; bản gốc trong môn còn nguyên.
- [ ] Tài liệu đã ở `_print/` hiện "đã gửi đi in"; chưa thì không.
- [ ] Tick "xong" → file rời `_print/`, cờ "cần in" được clear, badge về trung tính.

---

## Hết Phase 1
App dùng được thật: thêm tài liệu (Share) → mini PC convert → đồng bộ 3 máy → mở xem, nhớ chỗ đang đọc, biết khi nào an toàn đổi máy, lỡ xóa thì cứu được, gom tài liệu đi in không sót/nhầm. Sidecar đã chứa sẵn tri thức cho Phase 2 (Search + Cross-link) cắm vào sau mà không phải đập kho.
