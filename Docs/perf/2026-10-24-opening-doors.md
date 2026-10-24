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

## A/B với cửa tủ

(Task 10.)
