# Spike: dựng index tìm kiếm từ kho thật (2026-09-05)

> Nhánh `spike/search-index` — khung đo throwaway (`SpikeSearchPage.tsx` + route + nút trong Cài
> đặt). Hai module lõi `src/search/tokenize.ts` và `src/search/invertedIndex.ts` thì KHÔNG throwaway:
> thuần, 19 test, dùng lại nguyên si khi dựng beat search thật.
>
> Máy: **UBS1** (Android 14, RAM 5.89 GB, 720×1600 @320dpi), kho QA thật qua SAF, APK release.
> **Lưu ý khi đọc số: máy đo lúc pin 3% và `Thermal Status: 1` (throttle nhẹ)** → thời gian có thể
> hơi bi quan hơn máy mát, pin đầy. Không đo lại vì kết luận không đổi ở mức chênh đó.

## Câu hỏi và câu trả lời

| Hỏi | Đáp |
|---|---|
| Dựng index nguội mất bao lâu? | **14,0 s** (trung vị 3 lượt: 13,92 · 13,97 · 14,07) |
| Lần mở sau? | **0,49 s** — đọc IndexedDB 482 ms + dựng lại Map 11 ms |
| Tra một từ? | **1,3–2,6 ms** (một lượt lẻ 11,4 ms) |
| Index chiếm bao nhiêu? | **24,6 MB** trong IndexedDB · **+85 MB** PSS (174 → 259 MB) |
| `Saf.readFile` có gãy như read-path PDF không? | **KHÔNG gãy, mà còn NHANH HƠN `fetch`** — xem mục dưới |

## Quy mô kho QA (số thật, không phải ước lượng)

- **11 môn · 178 tài liệu** có cặp pdf+json · **57 MB** sidecar
- **147.777 đơn vị** (`units[]`) · **20,76 triệu ký tự**
- **19.360 token khác nhau** · **3.034.057 posting**
- **Tài liệu rỗng text (ảnh chưa OCR): 1 / 178**

## Chia thời gian dựng nguội (đường `Saf.readFile`)

| Khâu | ms | phần |
|---|---|---|
| walk kho (`getKhoSnapshot`) | 920 | — |
| **đọc 178 sidecar** | **8.747** | **63%** |
| parse JSON | 361 | 3% |
| tách từ + dựng index | 4.856 | 35% |
| **tổng** | **13.970** | |

→ **Nút thắt là ĐỌC, không phải index.** Tối ưu tokenize là tối ưu nhầm chỗ; chỗ đáng làm là
**đừng đọc lại** file không đổi.

## ĐẢO NGƯỢC MỘT KHUYẾN NGHỊ TRƯỚC ĐÓ

Buổi 04/09 đệ khuyên *"đọc sidecar qua `WebViewLocalServer`, KHÔNG qua `readFile` String — đó là
đi lại vết OOM v1.4.1"*. **Đo xong thì ngược lại:**

| | `fetch` local-server | `Saf.readFile` (String qua bridge) |
|---|---|---|
| đọc 178 file (57 MB) | 14.198 ms | **8.747 ms** |
| file chậm nhất | 172 ms | 624 ms |
| tổng dựng nguội | 19,50 s | **13,97 s** |
| gãy? | không | **không** |

**Vì sao:** bài học OOM là về **MỘT file 64 MB** dựng một String ~170 MB trên Dalvik heap (cap
~256 MB). Sidecar thì nhỏ — trung bình 330 KB — mỗi String sống ngắn rồi được thu hồi, không bao
giờ chạm trần. Ngược lại `fetch` trả giá **mỗi file**: `probeReadable` (một lượt native) + một vòng
HTTP qua local-server, nhân 178 lần.

**Nhưng để ý cột "file chậm nhất": bridge 624 ms so với fetch 172 ms.** Giá của bridge tăng theo
KÍCH THƯỚC file, giá của fetch tăng theo SỐ file. Nên luật rút ra không phải "bridge tốt hơn" mà là:

> **Nhiều file nhỏ → bridge. Một file lớn → fetch.** Sidecar đi bridge, PDF vẫn đi fetch như v1.26.0.

Nếu sau này có sidecar rất lớn (giáo trình 400 trang toàn văn) thì phải đo lại ca đó.

## Dung lượng: có nên giữ nguyên văn đoạn trích trong index?

- index đầy đủ (có `text` từng đơn vị): **24,6 MB**
- index bỏ `text`, chỉ giữ trang + nhãn: **11,9 MB** → nguyên văn chiếm **12,8 MB**

**Đề nghị GIỮ nguyên văn.** Đổi 12,8 MB lấy việc hiện đoạn trích ngay mà không phải đọc lại sidecar
(mỗi lần đọc lại là ~50 ms/file theo số ở trên) là đáng. 24,6 MB trên điện thoại không đáng lo.

*Bẫy đã vấp khi đo cái này:* đo `navigator.storage.estimate()` mà **không xoá DB trước** thì ghi đè
bản ghi cũ cho delta **0 MB** — lượt đầu ra "CHIẾM 0.0 MB" và "nguyên văn chiếm −11,9 MB", số vô
nghĩa. Phải `deleteDatabase` trước mỗi lượt.

## Bộ nhớ

- JS heap sau khi dựng: **149,7 MB / trần 1.545 MB** — rộng rãi
- PSS (chính + renderer): **259 MB**, so với nền Home **174 MB** → **+85 MB**

Không nguy hiểm trên máy 6 GB (đọc PDF đơn 61 MB đã tốn 422 MB). Nhưng cũng đủ lớn để **không nên
giữ index trong RAM suốt phiên** — cân nhắc chỉ nạp khi vào màn Tìm.

## Kiến trúc đề nghị cho beat thật

1. **Dựng một lần, bền hoá, dùng lại.** 14 s là quá lâu để chạy mỗi lần mở app; 0,49 s thì không.
   Cần trạng thái "đang dựng index…" nhìn thấy được cho lần đầu.
2. **Làm mới theo từng tài liệu, không dựng lại cả kho.** Cần `COLUMN_SIZE` + `COLUMN_LAST_MODIFIED`
   thêm vào projection của `SafPlugin.listFolder` (2 dòng, **cùng cursor**, không tốn thêm vòng SAF).
   Thiếu cái này thì mỗi lần làm mới lại tốn trọn 14 s.
3. **Đọc sidecar bằng `Saf.readFile`**, không phải fetch (xem trên).
4. **Giữ nguyên văn trong index** (24,6 MB).
5. Tra cứu 1–3 ms → gõ-tới-đâu-tìm-tới-đó thoải mái, chỉ cần debounce nhẹ cho đỡ dựng lại danh sách.

## Chưa trả lời (đừng coi là đã xong)

- **Giá làm mới tăng dần** chưa đo — phụ thuộc mục 2 ở trên, chưa có thì chưa đo được.
- **Kho Prod của Gú khác kho QA** (QA 178 tài liệu; Ops doc ghi Prod ~107 PDF). Số sẽ khác, nhưng
  cùng bậc.
- **Xếp hạng kết quả**: hiện trả theo thứ tự đơn vị (tức thứ tự tài liệu), KHÔNG theo độ liên quan.
  Cả 4 truy vấn thử đều chạm trần 50 kết quả nên chưa biết tổng thật. Đây là việc của beat thật.
- **Ngưỡng chấp nhận UX cho lần dựng đầu** chưa hỏi Gú.

## Con số cho câu hỏi OCR

**1 / 178 tài liệu** trong kho QA không có text (ảnh chưa OCR). Nếu kho Prod cũng cỡ này thì OCR mở
khoá ~0,6% corpus → **chưa đáng làm**, đúng như spec §7 đã chốt (search Phase 2 không OCR). Cần đếm
lại trên kho Prod của Gú trước khi kết luận hẳn.
