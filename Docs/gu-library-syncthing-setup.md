# Gú's Library — Hướng dẫn setup hạ tầng Syncthing (tiền đề M3)

> **Đây là việc TAY, không phải việc của Claude Code.** App chỉ *đọc trạng thái* Syncthing; bản thân Syncthing phải được cài + ghép cặp + sync folder kho ở ngoài app. Làm xong cái này M3 mới nghiệm thu được (cả lúc CC soi REST API thật lẫn lúc test 3 trạng thái đèn).
> **Phạm vi tối thiểu để unblock M3:** chỉ cần **1 điện thoại dev + mini PC** ghép cặp + sync folder kho. Ghép nốt điện thoại 2 + tablet để *dùng thật* làm sau, không chặn code.

---

## 0. Bối cảnh & lựa chọn công nghệ

| Máy | Phần mềm | Lý do |
|---|---|---|
| Mini PC (Windows, 24/7) | **Syncthing chạy như Windows service** (qua installer Bill Stewart) | Node neo phải sync kể cả khi chưa ai đăng nhập. SyncTrayzor chỉ chạy khi có user login → KHÔNG hợp vai node neo. |
| 2 điện thoại + tablet (Android) | **Syncthing-Fork (Catfriend1)** | App Syncthing Android chính thức đã ngừng phát triển (bản cuối 12/2024). Fork của Catfriend1 là bản còn maintain, có trên F-Droid + Play. |

> **Lưu ý phiên bản:** Syncthing đã lên **v2** (đổi cấu trúc database + config, có một lần migration). Cả bản Windows lẫn Syncthing-Fork mới đều là v2. Khi cài, để nó migrate xong hẳn ở lần chạy đầu, **đừng tắt giữa chừng**. (Điều này cũng là lý do CC phải soi REST API trên instance v2 thật, không theo doc v1 cũ.)

---

## Phần A — Mini PC (Windows): Syncthing chạy như service

1. **Tải installer service:** `Bill-Stewart/SyncthingWindowsSetup` (GitHub) — installer mã nguồn mở, tự cài Syncthing thành Windows service auto-start. (Thay thế cho cách dựng NSSM thủ công.)
2. Chạy installer, chọn cài làm **service** (chạy lúc boot, trước khi login).
3. Sau khi cài, mở Web GUI: trình duyệt vào `http://localhost:8384`.
4. **Ghi lại 3 thứ** (sẽ cần ở Phần C + nhập vào app sau):
   - **Device ID của mini PC:** GUI → Actions (góc phải) → Show ID. Đây là ID huynh sẽ chọn trong app Gú's Library là "mini PC".
   - **API key của mini PC:** GUI → Actions → Settings → tab GUI → mục **API Key**. (Mỗi máy có key riêng — key này là của *mini PC*.)
   - **GUI listen address:** mặc định `127.0.0.1:8384`.
5. Đặt **đường dẫn folder kho** trên mini PC (vd `D:\GuLibrary\kho`). Đây sẽ là folder Syncthing share.

---

## Phần B — Điện thoại dev (Android): Syncthing-Fork

1. Cài **Syncthing-Fork (Catfriend1)** từ F-Droid (hoặc Play Store / APK GitHub). Để nó migrate v2 xong ở lần chạy đầu.
2. Cho phép app chạy nền (tắt battery optimization cho nó) để Syncthing không bị Android kill — nếu không, đèn trạng thái trong Gú's Library sẽ hay báo "không đọc được Syncthing".
3. Mở Web GUI của fork (trong app có lối vào Web UI, hoặc `http://127.0.0.1:8384`).
4. **Ghi lại 2 thứ** (của *điện thoại này*):
   - **Device ID của điện thoại.**
   - **API key của điện thoại** (Settings → GUI → API Key). ⚠️ Đây là key app Gú's Library *trên điện thoại này* sẽ dùng để đọc trạng thái — vì đèn báo "máy NÀY đã đẩy hết chưa" = đọc Syncthing local trên cùng máy. **Mỗi máy nhập key của chính nó.**

---

## Phần C — Ghép cặp mini PC ↔ điện thoại

1. Trên **mini PC GUI** → Add Remote Device → dán **Device ID của điện thoại** → đặt tên (vd "Dev Phone") → Save.
2. Trên **điện thoại** sẽ hiện thông báo "Device muốn kết nối" → chấp nhận; hoặc Add Remote Device → dán **Device ID của mini PC** → đặt tên "Mini PC".
3. Đợi hai máy báo **Connected** (cùng mạng WiFi nhà). Nếu mãi không connected: kiểm tra cùng subnet, firewall Windows cho phép Syncthing.

---

## Phần D — Tạo & share folder kho

1. Trên **mini PC GUI** → Add Folder:
   - Folder Path: `D:\GuLibrary\kho` (đã đặt ở Phần A).
   - Folder ID: đặt một ID dễ nhớ, vd `gu-library-kho` (ID này phải **giống nhau** trên mọi máy — đây là folder mà app M3 sẽ hỏi completion).
   - Tab **Sharing** → tick **Dev Phone** để share folder này sang điện thoại.
2. Trên **điện thoại** sẽ hiện lời mời "Mini PC muốn share folder gu-library-kho" → Accept → chọn đường dẫn lưu trên điện thoại (vd thư mục trong shared storage để sau này SAF của app trỏ vào).
3. Đợi sync. Bỏ thử vài file/thư mục mẫu vào `D:\GuLibrary\kho` trên mini PC → kiểm tra nó xuất hiện trên điện thoại.

> **Khớp với app:** folder kho trên điện thoại chính là folder mà ở M2 app đã xin quyền SAF để đọc. Trỏ SAF của Gú's Library vào đúng folder này.

---

## Phần E — Bật versioning trên mini PC (làm luôn, thỏa M8)

> Việc này thuộc milestone M8 (chống xóa nhầm lan truyền) nhưng là cấu hình Syncthing, làm luôn ở đây để khỏi quay lại.

1. Trên **mini PC GUI** → folder `gu-library-kho` → Edit → tab **File Versioning**.
2. Chọn **Staggered File Versioning** (giữ nhiều mốc, thưa dần theo thời gian) hoặc **Simple File Versioning** (giữ N bản gần nhất).
3. Đặt thời gian giữ tối đa **30 ngày** (theo spec mục 10).
4. **Chỉ cần bật ở mini PC** — nó là nơi giữ bản cũ tập trung. Khi lỡ xóa nhầm ở một máy, bản cũ moi lại từ folder versioning trên mini PC.

---

## Phần F — Nghiệm thu setup (trước khi gọi M3)

- [ ] Mini PC: Syncthing chạy như service, vẫn sync sau khi **đăng xuất / khởi động lại máy mà chưa login**.
- [x] Điện thoại ↔ mini PC: trạng thái **Connected**.
- [x] Bỏ 1 file vào `kho` ở mini PC → vài giây sau thấy trên điện thoại (và ngược lại).
- [x] Versioning bật trên mini PC: xóa thử 1 file → bản cũ còn trong folder versioning.

---

## Thông tin cần đưa vào app Gú's Library (cho M3)

Sau khi setup xong, ba thứ này là đầu vào cho M3 (đã chốt cách app nhận):

| Thông tin | Cách app nhận (đã chốt) |
|---|---|
| **API key của Syncthing trên máy này** | Nhập tay một lần vào Settings của Gú's Library (trên *mỗi* máy), lưu qua Preferences. |
| **Đâu là mini PC** | App gọi REST liệt kê devices → huynh chọn "đây là mini PC" một lần, lưu Preferences. |
| **Folder ID của kho** | `gu-library-kho` (để app hỏi `/rest/db/completion?folder=gu-library-kho&device=<minipc>`). |

> **Lưu ý kỹ thuật cho CC (M3):** app đọc REST qua `http://localhost:8384` của Syncthing trên *chính máy đó*; gọi bằng **native HTTP (CapacitorHttp)**, KHÔNG `fetch` trong WebView, để né CORS + mixed-content.

---

## Ghép nốt 2 máy còn lại (làm sau, không chặn M3)

Lặp Phần B + C + D cho **điện thoại 2** và **tablet**: cài Syncthing-Fork → ghép cặp với mini PC → accept share folder `gu-library-kho`. Mỗi máy có API key riêng, nhập vào Gú's Library trên máy đó.
