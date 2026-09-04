# Spike bộ nhớ 2-pane viewer (2026-07-22) — LƯU TRỮ

> Chép về từ nhánh `spike/split-screen-memory` trước khi xoá nhánh (04/09/2026). Nhánh đó là
> throwaway: code khung đo (`SpikeSplitPage.tsx` + probe trong `MainActivity`) đã chết, nhưng
> **số đo thì không** — Ops doc không chép lại lmkd / onTrimMemory / đỉnh 858MB, mà session log
> 26/07 lại trỏ thẳng vào file này. Giữ ở đây cho tham chiếu đó còn sống.
>
> **HAI CHỖ ĐÃ BỊ ĐO SAU VƯỢT QUA — đọc phần dưới thì trừ hao:**
> 1. *"WebView chạy 1-tiến-trình nên `dumpsys meminfo com.gulibrary.app` là ĐẦY ĐỦ"* (vòng 2, máy
>    UBS1) — **nay SAI**. Đo lại chính máy đó ngày 04/09/2026: WebView đã tách renderer ra tiến
>    trình riêng, lại còn có TỚI HAI `sandboxed_process0` (app khác cũng xài WebView). Cách đo đúng
>    nằm ở Ops doc §8 (v1.37.0). WebView tự cập nhật nên kết luận kiểu này có hạn dùng.
> 2. *"Graphics scale theo res màn → máy res cao sẽ tốn graphics hơn"* — đo S20 FE (Ops doc §8)
>    cho thấy gấp **2,25× số điểm ảnh** mà đỉnh chỉ tăng **+4,7%**. Ảnh hưởng nhỏ hơn spike đoán.
>
> Số đo trong file giữ NGUYÊN VĂN, không sửa — nó là ảnh chụp thời điểm đó.

---

# Spike: bộ nhớ 2-pane viewer — KẾT LUẬN

> Branch `spike/split-screen-memory` — throwaway, KHÔNG merge, KHÔNG bump.
> Đo trên **Z Flip 4** (QA, 8GB RAM), WebView 149, APK release v1.25.1+spike, 2026-07-22.
> Khung: `src/pages/SpikeSplitPage.tsx` — 2 pane trên/dưới, hardcode 2 PDF thật, tái dùng `PdfView` + `readPdfBytes`.

## Câu hỏi
Chạy HAI instance pdf.js đồng thời trong 1 WebView (slide + văn bản luật) → app sống hay gãy trên phone?

## KẾT LUẬN: **SỐNG cho render-concurrency — nhưng nút thắt là tầng ĐỌC, không phải 2 renderer.**

Hai pdf.js render đồng thời KHÔNG làm app gãy. App không văng, không renderer-kill, không app-kill, không leak.
Cái gãy (với file nặng) nằm ở `readFileBase64` (base64 trên Dalvik heap, cap ~256MB) — đúng chỗ OOM v1.4.1 — **trước cả khi tới bước render**.

## Số đo (dumpsys meminfo · logcat)

| Trạng thái | TOTAL PSS | Graphics | Java Heap | Kill/OOM |
|---|---|---|---|---|
| Baseline (Home) | 199 MB | 114 MB | 12 MB | — |
| **[A] worst-case** slide 11.7MB + luật **63.9MB** | — | — | 151 MB | luật pane **read-OOM** (alloc 170MB fail, growth limit 268MB) → **bị catch**, pane báo lỗi; **slide vẫn render, app KHÔNG crash** |
| **[B]** slide 11.7MB + luật **21.4MB** — 2 pane render | 459 MB | 235 MB | 88 MB | 0 |
| [B] cuộn mạnh cả 2 pane (~50 lần lật) | **858 MB (peak)** | **696 MB** | 21 MB | **0 kill / 0 lmkd / 0 OOM** |
| [B] settle (ngừng cuộn, còn trong split) | 629 MB | 483 MB | 6 MB | 0 |
| [B] đóng split → Home | 476 MB | 327 MB | 8 MB | 0 |
| [B] mở/đóng ×3 (Home mỗi vòng) | **~348 MB (plateau)** | ~231 MB | — | 0 — **không leo thang** |

- **0 renderer kill** (`onRenderProcessGone`/`viewer_crash` không kích hoạt) suốt mọi phase.
- **0 lmkd/lowmemorykiller** reclaim app mình. `onTrimMemory` từ APP MÌNH (`GuSpikeMem`) **không bao giờ fire** → hệ thống chưa từng ép app trim (foreground được ưu tiên). `onTrimMemory 40` trong log là của app KHÁC (nền).
- Mở/đóng lặp → PSS **plateau ~348MB**, KHÔNG tích lũy → **không rò rỉ**. (Không về hẳn baseline 199MB vì Ionic router cache trang + graphics buffer giữ high-watermark — nhưng BOUNDED.)

## Hai phát hiện then chốt

1. **Tầng ĐỌC là trần cứng.** `readFileBase64` nạp cả file thành base64 trên Dalvik heap. File luật 64MB cần alloc ~170MB → vượt cap 256MB khi slide đã chiếm chỗ → OutOfMemoryError (bị catch, pane báo lỗi, **app sống**). Đây KHÔNG phải lỗi 2-renderer; là giới hạn read-path có sẵn từ v1.4.1. Với 2 file VỪA (tổng ~33MB) thì đọc thoải mái.
2. **Graphics buffer là chỗ leo cao nhất khi render.** Cuộn nhanh 2 pane → graphics vọt 696MB (canvas pdf.js). Reclaim khi ngừng (696→483). Trên Flip 4 8GB thừa sức; trên phone RAM thấp hơn thì đây là vùng rủi ro.

## Khuyến nghị build thật

**Đi tiếp được, nhưng CÓ ĐIỀU KIỆN:**
- **(bắt buộc) Đổi read-path trước khi split file nặng:** không nạp cả file base64 qua bridge lên Dalvik heap. Đọc thẳng ArrayBuffer/stream (native file channel hoặc chunk) → mới mở được văn bản luật nặng trong pane. Không đổi thì pane nặng sẽ báo lỗi (như [A]).
- **(bắt buộc) CỜ VERIFY MÁY PROD:** peak 858MB (Graphics 696MB) lúc cuộn mạnh là an toàn trên **Flip 4 8GB** nhưng **CHƯA đo trên máy Gú (S20 FE 6GB / Z Flip 6)**. RAM 6GB + graphics-peak này là vùng lmkd có thể reclaim → **phải đo lại trên S20 FE trước khi cam kết build.** Flip 4 pass rộng rãi nhưng chưa đủ kết luận cho Prod.
- Nếu không muốn động read-path: **hạ scope** — pane phụ (slide) full, pane luật ở chế độ nhẹ (1 trang/lúc, không windowing rộng), hoặc chỉ cho split khi cả 2 file dưới ngưỡng (~25MB/file).

## Cách reproduce
Settings → nút "🔬 Spike: 2-pane viewer" (chỉ có trên branch này). Đổi `LAW_PATH` giữa [A]/[B] trong `SpikeSplitPage.tsx`. Đo: `adb shell dumpsys meminfo com.gulibrary.app`; `adb logcat -d | grep -iE "GuSpikeMem|lmkd|RenderProcessGone|OutOfMemory"`.

---

# VÒNG 2 — verify máy 6GB (gỡ cờ chặn split-screen)

> Đo trên **Unisoc T616 / 6GB RAM thật** (model UBS1, ums9230, màn 720×1600), APK release v1.26.0+spike (branch đã merge main v1.26.0 → read-path stream). Máy KHÔNG trên Syncthing, chép tay 3 file PDF vào kho. WebView chạy **1-tiến-trình** (không sandbox renderer riêng) nên `dumpsys meminfo com.gulibrary.app` là ĐẦY ĐỦ. 2026-07-22.

## KẾT LUẬN VÒNG 2: **PASS** — gỡ cờ, split-screen khả thi (S20 FE gần chắc pass).

Ca [A] (2 file NẶNG cùng render) — **chưa từng chạy được ở vòng 1** vì read-OOM base64 — **giờ SỐNG** nhờ read-path v1.26.0. App KHÔNG bị kill, KHÔNG renderer-gone, `onTrimMemory` của app mình KHÔNG bao giờ fire. lmkd CÓ reclaim nhưng **chỉ giết app NỀN** (`com.android.settings`, oom_adj 905) để nhường RAM cho app foreground — app mình luôn được bảo vệ.

## Số đo T616 (đặt cạnh baseline Flip 4 8GB vòng 1)

| Ca | T616 idle PSS / Graphics | T616 peak cuộn mạnh | Flip 4 (vòng 1) | Kill? |
|---|---|---|---|---|
| baseline | 102 MB / ~0 | — | 199 MB | — |
| **[A] slide 11.7 + luật 64MB** | 149 MB / 15 MB | **303 MB / 176 MB** | *chưa đo được (read-OOM)* | **0** (chỉ kill settings nền) |
| **[B] slide 11.7 + luật 21.4MB** | 169 MB / 30 MB | **298 MB / 153 MB** | idle 459/235, peak **858/696** | **0** |
| mở/đóng ×3 (Home) | plateau **~145 MB** (Graphics về ~1MB) | — | plateau ~348 MB | **0**, không leak |

- **T616 dùng ÍT bộ nhớ hơn Flip 4** dù RAM thấp hơn — vì màn 720p (ít pixel canvas: Graphics peak 176MB vs Flip 4 696MB). GPU yếu (Mali-G57 MP1) KHÔNG thành nút thắt trong đo này.
- **lmkd hoạt động mạnh** (giết `com.android.settings` nền liên tục, reason `<swap below high>`) = máy 6GB đang co để nuôi 2-pane foreground — NHƯNG app mình chưa hề bị đụng. Đây là tín hiệu "RAM thật đang căng" nhưng foreground được bảo vệ đúng như thiết kế Android.
- App RUNNING suốt (pid ổn định qua mọi ca), 0 crash, 0 renderer-gone.

## Đọc theo rule bất đối xứng (đã chốt trong spec)
- T616 khắt khe hơn S20 FE (GPU yếu hơn, non-Samsung lmkd hung hơn) **VÀ** màn thấp res hơn (ít graphics). PASS ở đây = **tín hiệu mạnh** → **S20 FE gần chắc pass** (RAM tương đương/hơn, One UI hiền hơn với foreground, GPU Adreno 650 khỏe hơn nhiều; res cao hơn nhưng RAM 6–8GB bù lại).
- → **GỠ CỜ.** Cam kết build split-screen được. Không cần mượn máy Gú trước (nhưng verify 1 lần trên máy Gú lúc build thật vẫn nên làm — không phải blocker).

## Lưu ý còn lại cho build split thật
- Peak ~300MB/máy 6GB là thoải mái, NHƯNG lmkd đã evict nền mạnh → nếu Gú mở split lúc nhiều app nền, cảm giác "app khác bị đá ra" có thể xảy ra (không phải bug app). Chấp nhận được.
- Graphics scale theo res màn: máy res cao (Fold mở trong, tablet) sẽ tốn graphics hơn — cân nhắc giới hạn split cho điện thoại dọc (đúng chủ đích ban đầu: Gú xài phone).
