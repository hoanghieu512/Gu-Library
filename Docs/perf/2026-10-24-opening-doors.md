# Mở lạnh và cửa tủ sách: số đo

Spec `Docs/superpowers/specs/2026-10-24-mo-cua-tu-sach-design.md`, plan `Docs/superpowers/plans/2026-10-24-mo-cua-tu-sach.md` (Task 1 và Task 10).

## Nền: bản 1.43.1 trên UBS1 (24/10/2026)

**Cách đo:** `am force-stop`, `screenrecord --bit-rate 8000000 --time-limit 16` chạy nền, sau 1 s mở bằng `monkey` (lệnh `monkey` tự mất khoảng 6 s mới khởi động). Mốc từng khung lấy bằng `ffprobe -show_entries frame=pts_time`; khung được xếp loại bằng tỉ lệ điểm ảnh trắng, kem (`#E9E5CD`) và nâu gỗ. t0 là khung đầu của hiệu ứng phóng icon ở launcher (gần đúng lúc chạm). Kho QA, máy cắm USB, màn sáng.

| Lượt | Khung trắng trơn | Nền kem | Vỏ app (thanh tiêu đề, ô tìm, thanh tab) | Kệ vẽ xong | Số tài liệu trên gáy |
|---|---|---|---|---|---|
| 1 | 0,01 đến 0,14 s | 0,14 s | 0,56 s | 3,35 s | 3,91 s |
| 2 | 0,03 đến 0,16 s | 0,16 s | 0,56 s | 3,33 s | 3,92 s |
| 3 | 0,02 đến 0,14 s | 0,14 s | 0,55 s | 3,41 s | 3,97 s |
| **Trung vị** | **khoảng 0,13 s** | **0,14 s** | **0,56 s** | **3,35 s** | **3,92 s** |

**Đọc số:**

- Splash hiện nay là một khung trắng trơn khoảng 0,13 s, không có icon: theme `Theme.SplashScreen` không được `installSplashScreen()` kích hoạt nên hệ thống chỉ vẽ nền trắng. Sau đó là nền kem (CSS đã nạp) rồi tới vỏ app.
- Từ lúc vỏ app hiện (0,56 s) tới lúc kệ vẽ xong (3,35 s), Trang chủ hiện chữ "Chưa có môn nào trong kho." và pill đồng bộ đổi từ "Chưa cấu hình" sang "Đã đồng bộ": khoảng 2,8 s trạng thái tạm dễ hiểu lầm. Cửa tủ sẽ che đúng khoảng này.
- Lớp cửa gắn vào cùng lúc React chạy (trước vỏ app một chút, khoảng 0,3 đến 0,5 s sau t0), nên trên UBS1 Trang chủ sẵn sàng khoảng 2,8 đến 3,0 s sau khi lớp cửa gắn. Hạn 2,5 s trong spec ngắn hơn số này: cửa sẽ mở ra đúng trạng thái tạm kể trên. Xem quyết định ở mục dưới.

## Quyết định từ số đo nền

- Hạn mở cửa (`DEADLINE_MS`) nâng từ 2,5 s lên 4 s: trên UBS1 Trang chủ cần khoảng 2,8 đến 3,0 s kể từ khi lớp cửa gắn, 4 s chừa biên cho máy chậm hơn mà vẫn giới hạn thời gian cửa đứng khi kho lỗi.

## Cửa tủ trên UBS1: điều đo được khi làm (Task 7)

- Ghi log tạm (`logWarn` khoảng cách giữa hai `requestAnimationFrame`, đã gỡ): ngay sau khi Trang chủ vẽ xong lần đầu, luồng chính của WebView bị chặn khoảng 1,4 s, và WebView Android không vẽ khung nào trong lúc đó, kể cả animation CSS chỉ dùng `transform`. Cửa mở lúc ấy thì xoay mà không có khung nào lên màn, rồi Trang chủ hiện luôn. Sửa: cửa chỉ nhận tín hiệu "Trang chủ sẵn sàng" sau khoảng 100 ms vẽ mượt (6 khung liền nhau cách dưới 50 ms, tối đa chờ 2,5 s, `src/opening/smoothFrames.ts`), và khi Trang chủ đã sẵn sàng thì hạn 4 s không ép cửa mở nữa.
- Sau lần đứng 1,2 đến 1,4 s còn một lần đứng nữa khoảng 0,3 đến 0,6 s, cách vài khung. Với 3 khung mượt và trần 1,5 s, lần đứng thứ hai nuốt mất đầu hiệu ứng; với 6 khung thì không.
- Nền kem của lớp cửa che Trang chủ suốt lúc cửa đóng nên Trang chủ chưa được vẽ; tới lúc mở mới vẽ lần đầu và đứng thêm 0,33 s. Sửa: lớp nền kem rút đi 150 ms sau khi cửa hiện đủ, Trang chủ được vẽ sau cánh cửa.
- Splash hệ thống tắt ngay khi Activity vẽ khung đầu (nền kem), WebView còn khởi động khoảng 0,8 s nữa, nên icon trên splash hệ thống không kịp hiện (mở từ launcher cũng vậy). Huy hiệu panda vì thế vẽ ở `index.html` và ở lớp phủ kem.

## Danh sách kiểm trên máy (Task 10), 24/10/2026

Bản có cửa `b9778b9` trên UBS1 (Android 14), ghi hình mỗi ca và đếm khung có cửa.

| Ca | Kết quả |
|---|---|
| Mở lạnh từ launcher | Đạt: nền kem có huy hiệu, cửa, cửa mở lộ Trang chủ thật, không có khung trắng |
| Chạm khi cửa đang đóng | Đạt: cửa bật mở trong khoảng 0,15 s, vào Trang chủ (lúc đó còn đang nạp) |
| Nút back khi cửa đang đóng | Đạt: như chạm, app vẫn ở tiền cảnh, không thoát |
| Về nền rồi mở lại | Đạt: không có khung cửa nào sau lần bấm Home |
| Mở qua "Chia sẻ" một PDF khi app đang tắt | Đạt: không có cửa, bảng "Lưu vào môn nào?" hiện ngay (đóng bằng back, không nhập gì) |
| Tắt công tắc trong Cài đặt rồi mở lạnh | Đạt: không có cửa; bật lại công tắc sau khi kiểm |
| Máy bật "Xoá hiệu ứng động" | **Chưa kiểm**: cần đổi thang hiệu ứng của hệ thống trên máy |
| Bảng "Có gì mới" hiện sau cửa | **Chưa kiểm trên máy**: bản thử vẫn mang version 1.43.1 đã xem; có test tự động, kiểm thật khi cài 1.44.0 |
| dGen1 (màn vuông) | **Chưa kiểm**: máy không cắm lúc làm; xem trước bằng ảnh ghép 720 × 720 |
| e2e (`npm run e2e`, UBS1) | Đạt 10/10, 5 ph 11 s (bản 1.43.0: khoảng 4 ph): mỗi test chờ cửa đi khỏi sau `app.open()`, $0, không gọi model |

## A/B: 1.43.1 và bản có cửa, UBS1, 24/10/2026

**Cách đo:** mở bằng chạm icon ở launcher (không dùng `monkey`), 3 lượt mỗi bản, `am force-stop` trước mỗi lượt. "Trang chủ đứng yên" là khung đầu của màn hình cuối cùng (so ảnh, bỏ thanh trạng thái), tính từ khung đầu tiên rời launcher. Khung giật đọc `dumpsys gfxinfo` 13 s sau khi mở (tiến trình mới nên đếm từ lúc khởi động). PSS đọc cùng lúc, tiến trình app cộng tiến trình renderer `sandboxed_process0` của app. Bản có cửa dựng từ nhánh `feat/opening-doors` (`b9778b9`, version vẫn ghi 1.43.1), ký release, cài đè.

| | 1.43.1 | Có cửa |
|---|---|---|
| Trang chủ đứng yên (3 lượt) | 4,73 · 4,34 · 4,45 s | 5,99 · 6,85 · 6,35 s |
| **Trung vị** | **4,45 s** | **6,35 s (+1,9 s)** |
| Khung đã vẽ / giật (13 s đầu) | 46 đến 49 khung, 7 đến 12 giật | 251 đến 324 khung, 11 đến 18 giật |
| PSS app + renderer sau khi cửa đã rời DOM | 99,4 + 89,3 MB (trung vị) | 103,7 + 93,5 MB (trung vị), +8 MB |
| APK | 5 342 714 B | 5 473 338 B (+131 KB) |

**Đọc số:**

- Cửa thêm khoảng 1,9 s cho tới lúc Trang chủ đứng yên, nhiều hơn mục tiêu "khoảng 1 s" của spec. Phần lớn là chờ: cửa không mở được trong hai lần WebView đứng hình sau khi Trang chủ vẽ xong. Ở bản 1.43.1, hai lần đứng đó vẫn có nhưng không lộ ra vì màn hình lúc ấy đứng yên, và Trang chủ trong lúc đó cũng không nhận chạm. Phần còn lại là chính hiệu ứng 1 s và 0,1 s chờ vẽ mượt.
- Số khung vẽ cao hơn vì panda nhún và vệt sáng nhấp nháy suốt lúc cửa đóng; số khung giật tuyệt đối gần như nhau. Không tuyên bố 60 FPS: các lần đứng hình là của Trang chủ, cửa không làm chúng ngắn đi.
- PSS cao hơn khoảng 8 MB sau khi cửa đã rời DOM: ảnh đã giải mã còn trong bộ nhớ đệm ảnh của WebView. Chưa đo lại sau vài phút ở tiền cảnh.

## Video native thay cho cửa CSS (25/10/2026)

Spec `Docs/superpowers/specs/2026-10-25-mo-cua-video-design.md`. Clip 4,2 s phát bằng lớp Android nằm trên WebView. Cách đo như mục A/B ở trên (chạm icon ở launcher, 3 lượt, UBS1, kho QA, `am force-stop` trước mỗi lượt). Bản dựng từ nhánh `feat/opening-doors`, version vẫn ghi 1.43.1.

**Bản đầu dùng `TextureView`:** Trang chủ đứng yên ở 5,40 · 5,04 · 5,06 s, nhưng video đứng 1,27 đến 1,30 s ngay giữa clip (khung 3,85 s là panda bước vào thư viện, khung kế tiếp 5,13 s đã là panda vẫy tay ở cuối). Lúc Trang chủ vẽ lần đầu, WebView chặn luồng giao diện của app, mà `TextureView` chỉ cập nhật khi luồng đó vẽ. Đây cũng là lý do animation CSS của bản cửa đứng hình.

**Bản dùng `SurfaceView`** (bộ giải mã đẩy khung thẳng lên compositor, khung đầu và khung cuối là ảnh tĩnh):

| | 1.43.1 | Video `SurfaceView` |
|---|---|---|
| Trang chủ đứng yên (3 lượt) | 4,73 · 4,34 · 4,45 s | 5,59 · 5,13 · 5,14 s |
| **Trung vị** | **4,45 s** | **5,14 s (+0,69 s)** |
| Video đứng hình giữa clip | | Không có khoảng nào quá 0,2 s trong clip |
| PSS app + renderer 13 s sau khi mở | 99,4 + 89,3 MB | 106,4 + 87,6 MB (trung vị) |
| APK | 5 342 714 B | 6 640 325 B (+1,30 MB) |

**Sau review (thả hai ảnh tĩnh khi lớp video đi):** PSS app ở giây 13 là 101,7 · 98,5 · 98,5 MB (trung vị 98,5 MB, ngang 1.43.1 ở 99,4 MB); trước khi sửa là 106,4 MB, đúng bằng hai bitmap 696 × 1320 (khoảng 7,3 MB) còn bị giữ.

**Danh sách kiểm (UBS1, Android 14):** chạm và back giữa clip vào Trang chủ ngay (đang nạp thì thấy trạng thái nạp); bấm Home giữa clip rồi mở lại là Trang chủ, không phát lại; share PDF lúc app tắt: không có clip, bảng "Lưu vào môn nào?" hiện; share tới lúc clip đang chạy: clip bỏ qua, bảng hiện; tắt công tắc: không có clip (đã bật lại). Chưa kiểm "Xoá hiệu ứng động" (cần đổi thang hiệu ứng hệ thống).

**dGen1 (Android 15, màn vuông):** mở lần đầu sau khi cài bằng `monkey`. Splash hệ thống hiện huy hiệu panda trên nền kem; clip cắt vuông vẫn đủ đoạn đi vào, đẩy cửa, thư viện, vẫy tay (mặt panda ở khung cuối lệch xuống góc nhưng rõ); không đứng hình; bảng "Có gì mới" hiện sau clip.

**e2e:** 10/10, 5 ph 1 s, $0.

**Đọc số:** Trang chủ hiện chậm hơn 1.43.1 khoảng 0,7 s, vượt nhẹ mức "khoảng 0,5 s" của spec. Giờ thời gian bị chặn bởi độ dài clip (4,2 s, nhịp huynh đã duyệt) cộng khoảng 0,2 s khởi động và 0,3 s mờ, không còn bởi Trang chủ: Trang chủ đã sẵn sàng trước khi clip hết. Muốn về dưới 0,5 s thì cắt clip thêm khoảng 0,2 s hoặc mờ 200 ms thay vì 300 ms.

## Clip Grok (1.44.1), 25/10/2026

Clip mới làm bằng Grok Imagine, cắt về 4,17 s (spec §3, §6). Đo song song 1.44.0 và 1.44.1 trên UBS1 cùng buổi tối, kho QA, bằng cùng một script: `am force-stop`, `screenrecord` 15 s, chạm icon ở launcher (toạ độ lấy từ `uiautomator dump`), PSS bằng `dumpsys meminfo` ở giây 13. "Trang chủ đứng yên" tính từ khung đầu rời launcher tới khung đầu giống hẳn khung cuối (ảnh thu nhỏ, bỏ thanh trạng thái), nên thấp hơn bảng ở mục trên khoảng 0,5 s; chỉ so được giữa hai bản trong bảng này. 1.44.0 cài lại bằng `adb install -r -d` rồi cài 1.44.1 lên lại.

| | 1.44.0 (clip Higgsfield) | 1.44.1 (clip Grok) |
|---|---|---|
| Trang chủ đứng yên (3 lượt) | 4,63 · 4,58 · 4,57 s | 4,59 · 4,55 · 4,55 s |
| **Trung vị** | **4,58 s** | **4,55 s** |
| Khoảng lâu nhất không có khung mới, trong clip | 0,11 đến 0,20 s | 0,14 đến 0,18 s |
| Khoảng đó ở 0,45 s cuối clip (đoạn vẫy chậm và lúc đổi sang ảnh tĩnh) | 0,20 đến 0,29 s | 0,22 đến 0,26 s |
| PSS app giây 13 | 107,4 · 104,8 · 105,0 MB | 104,7 · 105,0 · 105,1 MB |
| APK | 6 640 717 B | 6 689 129 B |

**Đọc số:** hai bản ngang nhau. PSS ở giây 13 tối nay cao hơn số 98,5 MB đo buổi sáng ở cả hai bản, nên chênh là do điều kiện đo (máy, kho, thời điểm), không do clip. Bằng các bản ghi cũ, cùng script cho 1.43.1 là 4,09 · 3,98 · 3,93 s và bản `SurfaceView` buổi sáng là 5,03 · 4,58 · 4,56 s.

**dGen1 và UBS1, mở lần đầu sau khi cài (`monkey`):** clip chạy đủ, bảng "Có gì mới" hiện đúng mục 1.44.1 trên cả hai. dGen1 cắt vuông vẫn thấy cửa mở, panda bước vào và vẫy (phần dưới thân bị cắt như clip cũ).

## Clip Halloween (1.45.0), 26/10/2026

Hai máy test để ngày 26/10, nằm trong khoảng Halloween, nên 1.45.0 phát clip Halloween còn 1.44.1 phát clip mặc định: đúng thứ Gú sẽ thấy. Đo trên UBS1 bằng cùng script với mục trên, cùng buổi; 1.44.1 cài lại từ `releases/` bằng `adb install -r -d` rồi cài 1.45.0 lên lại.

| | 1.44.1 (clip mặc định) | 1.45.0 (clip Halloween) |
|---|---|---|
| Trang chủ đứng yên | 4,73 · 4,56 · 4,53 s | 5,49 · 4,57 · 4,54 · 4,58 s |
| **Trung vị** | **4,56 s** | **4,58 s** (4 lượt) |
| Khoảng lâu nhất không có khung mới, trong clip | 0,13 đến 0,20 s | 0,15 đến 0,18 s (lượt 2 đến 4) |
| PSS app giây 13 | 104,1 · 103,9 · 104,4 MB | 98,4 · 103,0 · 101,3 · 106,5 MB |
| APK | 6 689 129 B | 8 544 739 B |

**Đọc số:** hai bản ngang nhau. Lượt 1 của 1.45.0 là lượt đầu sau khi máy vừa thức (màn tắt mấy phút lúc sạc): Trang chủ nạp chậm nên lớp video giữ khung cuối khoảng 0,9 s rồi mới mờ; clip không đứng giữa chừng (khoảng 0,57 s không có khung mới nằm ở khung cuối). Lượt đầu của 1.44.1 (ngay sau khi cài) cũng chậm hơn hai lượt sau. Lượt thứ tư của 1.45.0, ngay sau khi cài lại, ra 4,58 s.

**Mở lần đầu sau khi cài (`monkey`):** UBS1 và dGen1 đều phát clip Halloween rồi hiện bảng "Có gì mới" mục 1.45.0. Trên dGen1 khoảng lâu nhất không có khung mới trong clip là 0,05 s.

