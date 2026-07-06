# Điều tra hiệu năng — báo cáo (2026-07-04)

Máy đo: **Z Flip 4 (Prod, kho thật)** — release build + bộ đo PINV trên nhánh tạm `perf-inv-baseline` (2 commit `9179c46` + `fda5e8a`, KHÔNG merge). Kho lúc đo: 8 môn, ~100 file, ~10 mục đang đọc dở, 4 file `_reading-*.json`. Fold 3 không cắm — số Fold 3 suy từ cùng đường code (ghi rõ ở từng mục). Máy đã được trả về bản v1.7.0 sạch sau khi đo.

---

## Q1 — Cold start 17–27s tiêu vào đâu?

**Kết luận:** ~99% nằm SAU khi WebView chạy JS (bundle/native không đáng kể). Thủ phạm là **chuỗi quét SAF ở Home.reload, chạy ×2**, trong đó riêng `listReading` chiếm ~78%.

**Bằng chứng (một cold start, Flip 4, painted t=24.68s):**

| Đoạn | ms | SAF calls |
|---|---|---|
| WebView nav → JS main chạy (`boot.main-eval`) | 158 | 0 |
| `getRootUri` + `migrateOnce` | ~95 | 0 |
| **`listReading`** | **19,047** | **211** |
| `listMon` | 1,518 | 32 |
| `listInboxByMon` | 560–973 | 12–19 |
| `countPrintFlagged` | 2,827–3,245 | 52–59 |
| **Cộng** | **≈24.5s** | |
| `home.painted` (mốc người dùng) | **24,679** | tổng 315 calls |

Cộng khớp tổng ✓. (Hôm nay 24.7s > baseline 17.6s vì thêm mục đang đọc + provider lạnh sâu; cùng bậc.)

- **Reload chạy ĐÚP:** log `home.reload START t=197` và `t=220` — cả `useIonViewWillEnter` ([HomePage.tsx:55](../../src/pages/HomePage.tsx)) lẫn `useEffect` mount (dòng 56) cùng bắn → mọi SEG hiện 2 dòng, toàn kho quét ×2.
- **Số vòng SAF thực tế:** 315 calls tới lúc painted; `saf.listFolder` **248 lần, tổng 52.2s call-time** (2 luồng reload song song). Root (n=32) bị list lặp hàng chục lần.
- **Vì sao `listReading` 19s:** đọc 4 file `_reading-*.json`, rồi **mỗi entry** walk path từ root **2 lần** (`resolveUriFromRelPath` + `readDisplayNameNextTo` — [store.ts:89-142](../../src/reading/store.ts)), mỗi walk 2–3 `listFolder` → 211 calls × ~90ms.
- **Chi phí 1 listFolder (native, đo):** n=32 lạnh = 100–408ms, trong đó `nameLoop` (query per-child của `DocumentFile.getName()`) chiếm 60–75% (vd `listFiles=30ms nameLoop=131ms`).
- Sau painted còn đuôi: `MonCard.summarizeMon` walk cây từng môn ×8 card ×2 (84ms–2,243ms/cái).
- Native trước WebView ≈ ~1s (từ `am start` tới listFolder đầu ≈ 0.6s) — **tin cậy trung bình** (đo gián tiếp qua timestamp logcat).
- Fold 3 (27.2s baseline): cùng đường code, I/O chậm hơn — **chưa phân rã riêng, tin cậy trung bình**.

## Q2 — Sau action, UI cập nhật bằng đường nào?

**Kết luận:** Không mutate RAM — **quét lại đĩa toàn bộ** (`refresh()` → `listFolder`). Bản thân vòng đó nhanh (~0.2–1s). Cái gây "trơ" là **mỗi op phát `emitKhoChanged()` → HomePage (mount dưới) full-reload 10–11s chạy nền**, chiếm kênh SAF.

**Bằng chứng:**
- Move 1 doc: `q3.moveDocument` 365–551ms (7 calls) → `FILE-OPS-DONE +841/+1169ms` → `folder.listing-PAINTED +42/+182ms`. Delete 1 doc: `deleteDocument` 102ms (3 calls) → DONE +581ms → PAINTED +62ms.
- **Chuỗi gây trơ (đo được):** ngay giữa batch-move, log `home.reload START t=294003` chen vào → `home.listReading 10,514–11,151ms / 110 calls` chạy nền. Nguồn phát: `emitKhoChanged()` trong `moveDocument`/`deleteDocument`/`setDisplayName` ([docRepo.ts:30,50,78](../../src/storage/docRepo.ts)) — **lô N file = N phát**. Khi bão nền chạy, listFolder khác chậm 2–4× (119ms→471ms đo cùng dir).
- Lô nhiều file: UI chỉ refresh SAU TOÀN lô (`refresh()` cuối [FolderPage.tsx](../../src/pages/FolderPage.tsx)) → file đầu "trơ tại chỗ" suốt thời gian lô + bão nền.
- "File lâu biến mất" trên **máy kia** = Syncthing propagation (ngoài app) — **chưa đo, tin cậy thấp**.

## Q3 — Import/Chuyển có cho nội dung file qua cầu JS không?

**Kết luận: KHÔNG.** Copy là stream thuần native; JS chỉ nhận `{uri, name}`. Copy local không phải nút nghẽn.

**Bằng chứng:**
- Code: `SafPlugin.copyToDir` ([SafPlugin.java:160](../../android/app/src/main/java/com/gulibrary/app/SafPlugin.java)) — `openInputStream(src)` → buffer 8KB → `openOutputStream(dst)`, không Base64, không qua bridge (khác `readFileBase64` của Viewer/ca v1.4.1).
- Đo native: 329KB → stream **20–28ms**; **20MB → stream 79ms (~265MB/s)**; `uniqueName` 18–86ms; `createFile` 14–23ms. `moveDocument` 20MB tổng 392ms — ngang file 329KB.
- **Outlier 34–50s:** không thể do copy local (20MB=79ms). Ứng viên chính: **nguồn picker là cloud-URI (Drive…)** — `openInputStream(srcUri)` tải qua mạng ngay trong vòng stream, cùng hàm nhưng throughput = mạng — **chưa đo trực tiếp (cần file Drive thật), tin cậy trung bình**; cộng hưởng bão reload nền nếu có op trước đó. Import emit `khoChanged` 1 lần/lô ([inboxRepo.ts:47](../../src/import/inboxRepo.ts)) nên nhẹ hơn move/delete lô.

## Q4 — Sheet chọn đích lần đầu dựng cây bằng gì? Cache ở đâu?

**Kết luận:** Dựng bằng `listMon()` **mỗi lần mở** — app KHÔNG có cache nào. "Lần sau nhanh" là cache của **DocumentsProvider/OS** ấm lên, không phải app.

**Bằng chứng:**
- Code: `useEffect [isOpen]` gọi `listMon` ([ChooseMonSheet.tsx:44](../../src/import/ChooseMonSheet.tsx)); drill gọi `listFolder` mỗi tap.
- Đo: 2 lần mở liên tiếp = `READY +726ms` và `+854ms`, **16 SAF calls y hệt cả 2 lần** → không cache app. Cùng listFolder root: lạnh 432–691ms → ấm 119–184ms (**3–6×**) → "lần đầu rất lâu" = provider lạnh (nếu trùng cold start thì cộng thêm bão reload).
- "Tạo folder mới làm cache mù?" — không có cache để mù; sheet re-list mỗi lần mở nên folder mới trong máy hiện ngay lần mở kế. "Folder mãi mới xuất hiện" chỉ khớp **máy khác chờ Syncthing** — **chưa đo, tin cậy thấp**.

---

## Xếp hạng thủ phạm (ước tính ms tiết kiệm, mỗi mục 1 dòng hướng)

| # | Thủ phạm | Tác động ước tính | Hướng (1 dòng) |
|---|---|---|---|
| 1 | `listReading` walk-từ-root ×2 walk/entry ([store.ts](../../src/reading/store.ts)) | **~15–19s** cold start + 10–11s mỗi bão nền | Resolve từ MỘT lần quét cây (hoặc cache uri), bỏ walk lặp |
| 2 | Home reload ĐÚP lúc mount ([HomePage.tsx:55-56](../../src/pages/HomePage.tsx)) | **~50% mọi chi phí Home** (~12s cold) | Gộp còn 1 trigger |
| 3 | `emitKhoChanged` per-op → full-reload nền ([docRepo.ts:30,50,78](../../src/storage/docRepo.ts)) | 10s+ sau MỖI action, ×N trong lô | Emit 1 lần/lô + debounce + reload tối thiểu |
| 4 | `countPrintFlagged` walk TOÀN kho mỗi reload ([printRepo.ts:83-93](../../src/print/printRepo.ts)) | ~3s/reload | Đếm gộp trong 1 lần quét chung |
| 5 | `summarizeMon` walk cây/card/reload ([MonCard.tsx](../../src/components/MonCard.tsx)) | ~2s ×8 card | Gộp vào cùng 1 lần quét kho |
| 6 | Native `listFolder` nameLoop per-child ([SafPlugin.java:71](../../android/app/src/main/java/com/gulibrary/app/SafPlugin.java)) | 60–75% chi phí MỖI listFolder | Query `DocumentsContract` 1 lần đủ cột thay `DocumentFile.listFiles+getName` |
| 7 | Sheet `listMon` mỗi lần mở ([ChooseMonSheet.tsx:44](../../src/import/ChooseMonSheet.tsx)) | 0.7–1.5s/lần mở | Cache phiên, invalidate theo khoChanged |

Mục riêng chưa đủ số: **outlier import 34–50s** — cần 1 phép đo với file từ Drive thật (nghi tải mạng trong stream). Đề xuất đo bổ sung trước khi thiết kế phần import.

## Trạng thái dọn dẹp

- Nhánh đo: `perf-inv-baseline` (2 commit wip) — **xóa sau design session**. Main không có commit nào.
- Flip 4 đã cài lại **v1.7.0 sạch** (không log). Kho: file test `zzz-perftest-20mb.*` đã xóa qua app (tombstone sync bình thường); tài liệu thật "Bai 10 - Suy luan quy nap edit 2021" đã hoàn nguyên đúng chỗ `Logic/Slide bài giảng/` (pdf+json, xác minh trên đĩa).
- DỪNG theo brief: không vá gì — kiến trúc fix chốt ở design session.
