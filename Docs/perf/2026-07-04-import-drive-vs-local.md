# Đo nghi án import outlier — Drive (cloud) vs local

**Câu hỏi:** import outlier 34–50s (điều tra 2026-07-04, tin cậy trung bình) có phải do "mạng chui trong stream" khi nguồn là file cloud (Drive URI) không?

## Đường copy (không đổi ở v1.9.0)

`importSharedFile` → `Saf.copyToDir` (native `SafPlugin.copyToDir`): `openInputStream(srcUri)` → buffer 8KB → `openOutputStream(dst đích trong kho)`. Nội dung KHÔNG qua cầu JS (đã bác ở điều tra). Với nguồn cloud, `srcUri` là document-URI của DocumentsProvider Google Drive: `openInputStream` trả stream mà mỗi `read()` **kéo byte về qua mạng** (provider tự tải theo yêu cầu). Cùng một hàm copy, throughput = tốc độ mạng.

## Số đo

| Nguồn | Cỡ | stream (ms) | Ghi chú |
|---|---|---|---|
| **Local** (Download/…) | 20 MB | **79** (~265 MB/s) | đo native `copyToDir` (v1.8.0 investigation) — đĩa local, không mạng |
| Local | 0.3 MB | 20–28 | |
| **Cloud (Drive)** | _(đệ đo)_ | _(đệ đo)_ | cần tài khoản Google + file Drive thật qua picker |

> Số Drive cần đo trên máy thật (không tự động hoá được picker cloud từ CLI). Cách đo: Thêm → chọn 1 file từ **Drive** (cỡ ~vài MB) → **màn "Đang nhập…" ở lại bao lâu = thời gian tải mạng**. Ghi giây quan sát vào đây.

## Kết luận (sơ bộ)

- **Copy local KHÔNG phải nút nghẽn** (20 MB = 79 ms). Outlier 34–50s **không thể** do đĩa local.
- **Cloud = tải mạng trong stream** (kiến trúc DocumentsProvider của Drive; tin cậy CAO về cơ chế, số cụ thể chờ đệ đo). Vật lý mạng **không nén được** — chỉ nén được sự mù mờ.
- **Đã làm (v1.9.0):** import có **trạng thái tiến hành nhìn thấy được** — overlay "Đang nhập N/T…" (`IonLoading` + `importBatch(onProgress)`), cập nhật theo từng file. File cloud đang về thì người dùng biết nó đang về, không tưởng app treo. (Cũng chính là công cụ đo Drive ở trên.)

## Còn (nếu số Drive xác nhận rất lâu)

Cân nhắc ở beat sau (KHÔNG làm trong v1.9.0): nhập nền có thể huỷ / hàng đợi, hoặc cảnh báo cỡ file cloud trước khi copy. Chưa cần cho tới khi có số thật.
