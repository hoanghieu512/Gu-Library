# Gú's Library — Design Spec

- **Tên hiển thị:** Gú's Library
- **Tên kỹ thuật (repo / applicationId base):** `gu-library`
- **Ngày:** 16/06/2026
- **Trạng thái:** Design đã chốt qua brainstorm, sẵn sàng chuyển sang `writing-plans`.

---

## 1. Tổng quan

### 1.1 Mục đích
App Android lưu trữ tập trung và xem tài liệu học luật cho **một người dùng duy nhất (Gú)**, dùng trên **3 thiết bị** (2 điện thoại Android + 1 Galaxy tablet), dữ liệu đồng bộ giữa cả ba. Tài liệu gồm slide bài giảng (PPTX/PDF) và văn bản luật (Word). Triết lý xuyên suốt: **local-first** và **ít thao tác nhất có thể** (người dùng không phải dev).

### 1.2 Người dùng & bối cảnh
- Một người dùng (Gú), tại một thời điểm chỉ dùng một thiết bị → **không có chỉnh sửa song song**, rủi ro xung đột sync gần như bằng 0.
- Gần như 100% thời gian các thiết bị cùng một mạng WiFi nhà. "Về nhà tự sync" được chấp nhận — không cần sync tức thời khi ra ngoài.
- Có sẵn 1 mini PC chạy 24/7 làm hạ tầng.

### 1.3 Nguyên tắc cốt lõi
1. **Local-first:** mỗi thiết bị giữ bản đầy đủ, đọc được offline, mở app là có ngay.
2. **File-based, không DB tập trung:** dữ liệu là nhiều file nhỏ, sync khỏe, mở bằng file manager vẫn hiểu được.
3. **Tách "định dạng để xem" khỏi "nguồn để hiểu":** PDF cho hiển thị, sidecar JSON cho tìm kiếm/cross-link.
4. **Index là dữ liệu phái sinh:** không sync, mỗi máy tự dựng lại từ file gốc.
5. **Mini PC là trung tâm xử lý nặng:** node neo đồng bộ + xưởng convert/extract + (sau này) auto-download. Điện thoại chỉ làm việc nhẹ.

---

## 2. Đóng gói & nền tảng

- App đóng gói bằng **Capacitor** (web app React/Vite bọc WebView native), build hoàn toàn bằng CLI (Android SDK command-line tools + Gradle + JDK), **không cần Android Studio**.
- Lý do chọn Capacitor: tận dụng stack JS/TS sẵn có, không học ngôn ngữ mới, đủ trưởng thành, gọi được tính năng máy (Share Intent, truy cập thư mục), chạy offline.
- **UI framework: Ionic + React** — cho sẵn component mobile (tab bar, chuyển trang, gesture, safe-area), trông native, giảm lượng visual design phải tự dựng. Theme bằng CSS variables (dễ áp palette ở mục 9.3). Dark mode để Ionic auto theo hệ thống (làm sau, không cản MVP).
- **Android scoped storage** là điểm cần xử lý cẩn thận: app cần xin đúng quyền truy cập thư mục kho (folder do Syncthing đồng bộ).

---

## 3. Đồng bộ (Sync) — *đã chốt*

### 3.1 Cơ chế
- **Syncthing** chạy ngầm trên cả 3 thiết bị + mini PC, đồng bộ folder kho.
- **Mini PC là node neo 24/7:** giải bài toán hai điện thoại không bao giờ bật cùng lúc — chúng đồng bộ gián tiếp qua con neo.
- App chỉ đọc/ghi folder kho; **không tự viết logic sync**.

### 3.2 Đèn trạng thái đồng bộ
App đọc API trạng thái của Syncthing và hiển thị **góc phải header**. Mốc an toàn là **"máy này đã đẩy hết lên mini PC chưa"** (KHÔNG cố báo "cả 3 máy đã giống nhau chưa" — không trả lời thành thật được vì máy kia có thể đang tắt). Ba trạng thái:

| Trạng thái | Ý nghĩa | Điều kiện |
|---|---|---|
| ✓ Đã đồng bộ | An toàn đổi máy | Không còn file chờ + thấy mini PC |
| ⟳ Đang đẩy… | Đợi chút | Còn file đang truyền lên mini PC |
| ⚠ Chưa thấy mini PC | Data còn kẹt ở máy này, về nhà mới đẩy được | Ngoài mạng / mini PC tắt |

- Không có nút "Sync now" để ra lệnh (Syncthing luôn tự chạy ngầm) — đèn chỉ để *yên tâm*, không phải để *ra lệnh*.

---

## 4. Mô hình dữ liệu — *đã chốt*

### 4.1 Cấu trúc kho
- **Folder = môn học**, cấp 1 là "môn" (nơi gắn metadata tên đẹp / màu). **Lồng tự do** bên dưới (Môn → Chương → Buổi → … tùy môn).
- Metadata **phân tán**, không có file manifest trung tâm (tránh file bị tranh chấp khi sync).
- Phần điều hướng phải xử lý **độ sâu bất kỳ** (breadcrumb Môn ▸ Chương ▸ …), không hardcode số tầng.

```
kho/
  _inbox/                         # file gốc chờ mini PC xử lý (đường VÀO)
  _print/                         # bộ tài liệu gom để đi in (đường RA, xem 5b)
  Luật Công chứng/
    _mon.json                     # metadata môn: tên hiển thị, màu, thứ tự
    luat-cong-chung-2024.pdf      # bản để XEM
    luat-cong-chung-2024.json     # sidecar: text + cấu trúc + vị trí
    Chương 1/
      slide-buoi-1.pdf
      slide-buoi-1.json
  Tố tụng Hình sự/
    ...
```

### 4.2 Mỗi tài liệu = cặp PDF + sidecar JSON
- **PDF:** bản canonical để xem (Viewer chỉ cần giỏi một việc: render PDF + nhảy trang).
- **Sidecar JSON (đi cùng tên):** chứa dữ liệu để *hiểu*, gồm:
  - Text đầy đủ (đã rút khi import).
  - **Cấu trúc Điều/Khoản/Điểm** (ranh giới + nhãn) — dành cho cross-link tới Điều.
  - **Vị trí gốc:** mỗi đoạn/Điều neo về trang số mấy trong PDF.
  - Metadata tài liệu: tên hiển thị, nguồn, ngày thêm, trạng thái xử lý.

### 4.3 Index tìm kiếm
- Là **dữ liệu phái sinh, KHÔNG sync.** Mỗi máy tự build index local từ các sidecar JSON nó nhận được.
- Hỏng/lệch thì xóa build lại; hai máy không bao giờ conflict vì không chia sẻ index.

### 4.4 Trạng thái "chờ xử lý"
- File gốc đã vào kho (qua Share khi ở ngoài) nhưng **chưa qua mini PC → chưa có PDF + sidecar**.
- App đánh dấu trạng thái ⏳: ở cấp môn (badge) và cấp tài liệu (file mờ, có nhãn, chưa bấm xem được).
- Tự hoàn tất khi về mạng và mini PC xử lý xong.

---

## 5. Đường nhập liệu (Import) — *đã chốt*

### 5.1 Đường chính: Share Intent
- Từ trình duyệt / Files sau khi tải file → **Share → Gú's Library** → app hỏi **chọn môn ngay** (gợi ý môn vừa dùng) + nút "Chưa phân loại" làm lối thoát nhanh.
- File gốc rơi vào `_inbox/` → Syncthing đẩy lên mini PC.

### 5.2 Đường phụ: Watch folder
- Lúc ngồi máy tính: copy file thẳng vào `_inbox/` → mini PC tự nuốt.

### 5.3 Đường dự phòng: nút "+" trong app
- Mở app → Thêm → file picker → chọn môn. Không phải đường mặc định.

### 5.4 Xử lý ở mini PC (xưởng convert + extract)
Mini PC watch `_inbox/`, với mỗi file:
1. **Convert sang PDF** bằng LibreOffice headless (fidelity desktop-class). PDF giữ nguyên; PPTX/Word → PDF.
2. **Extract sidecar** từ *file gốc* (gốc giữ cấu trúc sạch hơn PDF): rút text + cấu trúc Điều/Khoản + vị trí trang.
3. Đặt cặp `.pdf` + `.json` vào đúng môn, **bỏ file gốc**.
4. Syncthing rải về 3 máy.

> **Đánh đổi đã chấp nhận:** import "xịn" cần đi qua mini PC. Ở ngoài thì file gốc vào trạng thái ⏳, convert khi về nhà.

---

## 5b. Đường ra — đi in (Print outbox) — *đã chốt, C ở Phase 1*

**Vấn đề gốc:** quy trình cũ là copy thủ công từng file vào một folder Drive tên "in", share folder đó cho người thứ ba in giùm. Lỗi nằm ở khâu **chọn đúng file + copy tay từng cái mỗi kỳ thi** (dễ sót, dễ nhầm), không phải khâu in.

**Nguyên tắc:** đường ra **đối xứng đường vào** — `_inbox/` là đường file đi *vào* kho, `_print/` là đường file đi *ra* để in. App lo đúng khâu dễ sai (chọn + đặt tên + chống trùng); người chỉ còn một thao tác bulk.

**Luồng (C — MVP):**
1. Đang đọc/duyệt, Gú đánh dấu **"cần in"** ở từng tài liệu (tick rải rác theo thời gian, kể cả trên điện thoại lúc ôn).
2. Khi gom: app copy tất cả tài liệu "cần in" vào `_print/` trong kho, **đặt tên có tiền tố môn** để chống trùng (vd `[Tố tụng Hình sự] slide-buoi-1.pdf`). Bản gốc trong môn **giữ nguyên** (in lại kỳ sau).
3. Gú (ở PC có sync kho) **kéo nguyên folder `_print/` thả vào folder Drive "in"** — một thao tác bulk, folder đã đúng sẵn.
4. Người thứ ba in từ Drive **như cũ, không đổi gì**.
5. Nhận bản in về → Gú tick **"xong"** → app dọn file khỏi `_print/` và clear cờ "cần in".

**Trạng thái (2 mốc có nghĩa thật):**

| Trạng thái | Nguồn sự thật | Ghi chú |
|---|---|---|
| **Cần in** | Ý định người dùng — app-owned, **có sync** | Tick lúc đọc; tách hẳn khỏi sidecar |
| **Đã gửi đi in** | **Suy ra từ filesystem** — file đã có trong `_print/` | Không lưu state riêng |

- KHÔNG có trạng thái "đang in": việc in xảy ra ngoài app (người khác in), app không quan sát được → tránh trạng thái kẹt mãi.
- "Xong" là hành động dọn thủ công, không phải mốc app tự đoán.

**Ràng buộc đã chốt:**
- Cờ "cần in" là ý định người dùng → **phải sync** nhưng **KHÔNG ghi vào sidecar JSON** (sidecar do mini PC sở hữu/sinh; app + worker cùng ghi một file là đúng cảnh báo mục 14.4). Lưu dạng metadata app-owned **per-file** (không file hàng đợi tập trung) — đúng triết lý "nhiều file nhỏ, không file bị nhiều máy tranh ghi".
- Gom = **copy**, không move (giữ bản gốc trong môn).
- Tên trong `_print/` phải gắn tiền tố môn để chống trùng giữa các môn.
- `_print/` được Syncthing sync ra cả 3 máy + mini PC → nhân bản tạm; **kỷ luật dọn sau khi in** (versioning mục 10 đỡ lỡ tay).

**Đường nâng cấp (A — Phase 3, không đập lại C):** mini PC watch `_print/` (y như watch `_inbox/`) và tự đẩy lên folder Drive "in" bằng rclone/Drive API. Lúc đó bước 3 (kéo tay) biến mất, thành no-touch. Cùng một folder outbox, chỉ thêm chân Drive cho mini PC. Việc mini PC nói chuyện Drive vốn đã thuộc Phase 3 (off-site backup) — chân Drive cho outbox đi in **gộp chung** vào năng lực Drive đó, không phát sinh hạ tầng mới.

---

## 6. Xem tài liệu (Viewer)

- Chỉ render **PDF + nhảy tới trang cụ thể + highlight đoạn**. Slide PPTX đã thành PDF nên đồng nhất một đường xem.
- **Điểm cần thử nghiệm (không phải code một phát ăn ngay):** highlight đúng đoạn khi nhảy tới — phải vẽ overlay lên đúng vị trí text trong PDF.

---

## 7. Tìm kiếm (Full-text search) — *đã chốt, Phase 2*

- **Passage-level:** gõ từ khóa → hiện đoạn trích kèm vị trí (Điều/trang/slide) → bấm **nhảy thẳng tới đúng chỗ**, highlight.
- Chạy **hoàn toàn local** (không OCR vì slide gần 100% là text PPTX/PDF, không phải ảnh) → không cần server, không cần mạng.
- Ăn từ **sidecar JSON** qua một **lớp rút text thống nhất**: bất kể nguồn (PDF/PPTX/Word) đều nhả ra cùng dạng (plain text + vị trí). Thêm format mới sau này chỉ cắm thêm "đầu đọc", phần còn lại không đụng.
- Index per-máy, derived, không sync (xem 4.3).

---

## 8. Cross-link văn bản luật — *đã chốt (tới Điều), Phase 2*

- Bấm tham chiếu ("Điều 5", "khoản 2 Điều 5", "Nghị định 23/2015/NĐ-CP") → **nhảy tới đúng Điều**, highlight.
- Bản chất là **passage-jump** giống search, chỉ khác nguồn kích hoạt → tái dùng cùng hạ tầng, không xây mới.
- Phát hiện tham chiếu bằng **pattern thuần** (format luật VN rất quy luật) → chạy local, offline, **không cần LLM/API**.
- "Tới Điều" gần như miễn phí vì sidecar đã chứa cấu trúc Điều/Khoản (parse một lần lúc import).
- Reference trỏ tới văn bản **chưa có trong kho** → link "treo" kiểu unresolved wikilink (hiện xám), nối với nút tải từ **vbpl.vn** (KHÔNG phải thuvienphapluat).

---

## 9. UX shell — *đã chốt*

### 9.1 Màn hình chính: Home lai
Thứ tự trên màn:
1. Header: tên + đèn trạng thái đồng bộ (góc phải).
2. Ô search (lối tắt gõ nhanh).
3. **"Đang đọc dở"** — card tài liệu đang đọc + tiến độ trang (0 chạm để đọc tiếp). Điểm nhấn trên cùng vì đây là hành vi số một của người học.
4. Danh sách môn (số tài liệu, badge ⏳ nếu có file chờ xử lý).
5. Thanh điều hướng dưới: Trang chủ / Tìm / Thêm / Cài đặt.

### 9.2 Phân vai search
- Ô trên Home = lối tắt gõ nhanh.
- Tab "Tìm" = trang tìm đầy đủ (lọc theo môn, lịch sử tra cứu, kết quả passage-level dài). Hai vai khác nhau, không trùng.

### 9.3 Design direction (UI) — *đã chốt*

**Tông: "nâu giấy"** (Gú chọn) — ấm, gợi sách giấy, dịu mắt khi đọc lâu.

- **Palette gốc:** nền kem `#E9E5CD`, nhấn nâu `#75420E`, nhấn đậm `#553B08`, xám phụ `#AAAAAA`, trắng `#FFFFFF`. (Sắc độ sáng hơn `#FBF7F0`, `#FFFDF8` dùng cho nền/card.)
- **Cặp font:** sans (vd **Montserrat**) cho giao diện; **serif (vd Merriweather)** cho phần *nội dung đọc* (văn bản luật) và tiêu đề — serif đọc đỡ mỏi mắt khi đọc dài.
- **Nguồn cảm hứng (north star):** bộ "Goodreads Mobile Redesign" (Figma community). Lấy *hướng thẩm mỹ*, **không bê logo/branding** — Gú's Library giữ bản sắc riêng.

**Lấy từ cảm hứng (phần thẩm mỹ):** bảng màu nâu giấy; cặp font sans/serif; card "đang đọc dở" kiểu Currently Reading (cover + tiến độ + progress bar); search bar bo tròn ở đầu; bottom nav; layout màn Cài đặt (nhóm dày + ô tìm setting).

**KHÔNG lấy (phần xã hội — Gú không có):** Home kiểu feed (Latest Reviews / Trending / Discussion); Profile với Friends/Following/Clubs; Notifications xã hội; Reviews/Ratings sao; kệ xếp theo trạng thái đọc (Want to Read / Read) — Gú xếp theo **môn**, không theo trạng thái.

---

## 10. Backup — *đã chốt*

- **Rủi ro thật không phải hỏng ổ** (đã có 4 bản: 3 thiết bị + mini PC), mà là **xóa nhầm lan truyền** — Syncthing sync cả lệnh xóa ra mọi máy.
- **Bắt buộc:** bật **versioning của Syncthing trên mini PC** (giữ bản cũ file bị xóa/sửa, vd 30 ngày) → moi lại được khi lỡ tay.
- **Tùy chọn (Phase 3):** mini PC đẩy snapshot lên Google Drive định kỳ cho bản off-site.
- Kho là folder thuần → bản thân đã là "backup tự nhiên", copy đi đâu cũng sống.

---

## 11. Auto-download — *đã chốt phạm vi, Phase 3*

Hai nguồn thuộc hai thế giới khác hẳn, KHÔNG gộp:

| Nguồn | Quyết định | Lý do |
|---|---|---|
| **elearning HCMULAW (Moodle)** | **Làm** — dùng Moodle Web Services API với token của Gú | Tài liệu của chính người dùng, đường chính thống, ổn định hơn scrape. Điều kiện: trường bật Web Services; nếu tắt → lùi về tải thủ công + Share. |
| **Văn bản luật** | Kéo từ **nguồn công khai (vbpl.vn, Công báo)** | Văn bản quy phạm pháp luật không thuộc đối tượng bảo hộ quyền tác giả → nguồn mở sạch hoàn toàn. |
| **thuvienphapluat** | **KHÔNG auto-scrape** | Dịch vụ trả phí, có anti-bot, ToS cấm tải tự động. Nếu cần văn bản đó: lấy từ nguồn công khai hoặc tải thủ công rồi Share vào. |

---

## 12. Ranh giới module (để dễ test & bảo trì)

- **Storage layer** — đọc/ghi folder kho, hiểu cấu trúc môn/lồng, đọc metadata phân tán.
- **Sync status reader** — đọc API Syncthing → 3 trạng thái đèn.
- **Text-extraction layer** (ở mini PC) — nhiều "đầu đọc" (PDF/PPTX/Word) → một output chuẩn (text + cấu trúc + vị trí). Điểm mở rộng cho format mới.
- **Converter** (ở mini PC) — LibreOffice headless, mọi thứ → PDF.
- **Index builder** (per-máy) — sidecar JSON → index search local.
- **Search/cross-link engine** — passage-level, pattern phát hiện tham chiếu.
- **Viewer** — render PDF + nhảy trang + highlight.
- **UI shell** — Home lai, điều hướng độ sâu bất kỳ, Share Intent handler.
- **Print outbox** — đánh dấu "cần in" (app-owned per-file, có sync), gom → `_print/` đặt tên có tiền tố môn, dọn khi xong (mục 5b).

---

## 13. Lộ trình build (phân phase)

### Phase 1 — MVP: kho dùng được trên 3 máy
Data model (folder=môn, lồng tự do, PDF + sidecar) · Sync (Syncthing + mini PC neo + đèn trạng thái) · Import (Share → mini PC convert + extract) · Viewer (PDF, nhảy trang) · Home lai · Backup versioning · Print outbox mức C (gom `_print/`, kéo Drive tay — mục 5b).
→ Hết Phase 1 đã là app dùng được: thêm tài liệu, đồng bộ, xem.

### Phase 2 — Lớp tri thức (chỗ app khác biệt)
Full-text search (passage-level, index derived) · Cross-link tới đúng Điều.

### Phase 3 — Tự động hóa nhập liệu
Auto-download elearning (Moodle API) · Nguồn luật công khai (vbpl.vn) · Off-site backup (Drive) · Print outbox mức A (mini PC tự đẩy `_print/` lên Drive — gộp vào năng lực Drive).

> **Sợi chỉ xuyên suốt — quan trọng nhất khi bắt tay:** dù Search & Cross-link ở Phase 2, **Data model + sidecar ở Phase 1 phải chứa sẵn text + cấu trúc Điều/Khoản + vị trí trang ngay từ đầu.** Nếu không, Phase 2 phải đập sidecar xây lại + convert lại cả kho.

---

## 14. Rủi ro & điểm cần lưu ý khi triển khai

1. **Highlight passage trên PDF** — cần thử nghiệm, không phải làm một phát ăn ngay (mục 6).
2. **Android scoped storage** — xin đúng quyền truy cập folder kho (mục 2).
3. **Sidecar phải chuẩn bị cho Phase 2 ngay từ Phase 1** (mục 13).
4. **Sync friendly** — giữ dữ liệu dạng nhiều file nhỏ, metadata phân tán; tránh mọi file tập trung bị nhiều máy ghi.
5. **Phụ thuộc mini PC cho import "xịn"** — chấp nhận được trong mô hình "về nhà tự sync", nhưng cần trạng thái ⏳ rõ ràng.
6. **Moodle Web Services** có thể bị trường tắt → cần đường lùi (tải thủ công + Share).
7. **Scoped storage phần GHI** — app cần copy/ghi/xoá trong `_print/` (mục 5b), không chỉ đọc cây kho. Xếp cùng nhóm "cần thử nghiệm" với highlight PDF (mục 1).

---

## 15. Quyết định còn mở (để dành cho writing-plans)

- Thư viện render PDF cụ thể trên Capacitor/Android.
- Engine index search cụ thể (vd SQLite FTS5 local) — đã chốt *nguyên tắc* derived/không-sync, chưa chốt thư viện.
- Định dạng/schema chi tiết của `_mon.json` và sidecar (các trường chính đã liệt kê ở mục 4).
- Cơ chế cụ thể mini PC watch `_inbox/` (script + trigger).
- Cơ chế dọn `_print/` ở mức C (app xoá khi tick "xong" vs dọn định kỳ).
