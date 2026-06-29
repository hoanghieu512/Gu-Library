# Worker — Chuẩn hoá đuôi `.tmp` của file app (Samsung SAF)

> **Repo:** `gu-library-worker` (mini PC). **Lý do:** app (Android, ghi qua SAF) trên **Samsung** ghi FILE THẬT trên đĩa thành `<tên>.<ext>.tmp` ở một số ca (chập chờn, gặp ở pdf/docx/ppt…), trong khi MediaStore/`DocumentFile.getName()` báo tên sạch → **app không đọc/sửa được tên thật qua SAF**. Worker đọc filesystem thật (qua Syncthing) nên là nơi duy nhất sửa chắc.
>
> **Bằng chứng (app repo v0.8.1, 6 vòng đo logcat + adb):** `createFile` tạo `[Chưa phân loại] X (1).ppt` nhưng đĩa thật `= ...(1).ppt.tmp`; `getName()` trả `...(1).ppt` (nói dối). `renameTo` cũng chập chờn. Xác nhận không phải lỗi worker, không phải tên nguồn (đã strip ở app).

## Việc cần thêm vào worker (1 bước, TRƯỚC cổng lọc `.tmp` hiện có)

Trong vòng quét `_inbox/`, **trước** khi áp filter "skip `.tmp`", thêm bước **chuẩn hoá tên**:

**Nếu một file khớp mẫu file-app-bị-Samsung-thêm-đuôi:**
- Tên dạng `[<môn>] <phần còn lại>.<ext>.tmp` với `<ext> ∈ {pdf, doc, docx, ppt, pptx}` (đuôi tài liệu hợp lệ NẰM NGAY TRƯỚC `.tmp`), và
- KHÔNG phải file tạm của Syncthing (`.syncthing.*.tmp`) hay tải-dở (`.crdownload`, `.part`, …).

**→ rename (trên filesystem thật) bỏ đúng đuôi `.tmp` cuối:** `[<môn>] X.pdf.tmp` → `[<môn>] X.pdf`. Sau đó file đi tiếp luồng bình thường (stability-check → convert → extract → đặt vào môn).

### Ràng buộc
- **Chỉ strip đúng một `.tmp` cuối** khi phần trước nó là đuôi tài liệu hợp lệ. KHÔNG đụng:
  - `.syncthing.*.tmp` (file đang truyền của Syncthing — vẫn skip như cũ).
  - `*.crdownload` / `*.part` / `.tmp` mà trước đó KHÔNG phải đuôi tài liệu (không rõ nguồn → để yên, skip như cũ).
- **Trùng tên sau khi strip:** nếu `[<môn>] X.pdf` đã tồn tại trong `_inbox/` (hoặc đang xử trong cùng vòng) → đặt `X (1).pdf` (`(k)` TRƯỚC đuôi, cả cặp nếu cần) — đối xứng cơ chế dedup ở đích (spec 5.4). KHÔNG để `X.pdf (1)` (đuôi hỏng).
- **Stability-check vẫn áp** sau khi strip (chờ size đứng yên) trước khi convert — vì file có thể vẫn đang ghi.
- Idempotent / stateless như mọi bước worker.

## Vì sao không sửa ở app
- App đã làm hết phần khả thi (v0.8.1): mime-đúng khi `createFile` (giảm `.tmp` cho pdf/doc/docx/pptx), dedup `(k)` trước đuôi, strip `.tmp` của tên nguồn.
- Phần còn lại là **Samsung ghi `.tmp` ở tầng filesystem mà SAF che mất** — app không quan sát được tên thật để sửa. Worker (FS thật) bắt phổ quát mọi loại, mọi máy.

## Kiểm thử (worker repo)
- [ ] File `[Tố tụng Hình sự] a.pdf.tmp` trong `_inbox/` → worker rename `a.pdf`, convert + đặt đúng môn, bỏ gốc.
- [ ] `[Chưa phân loại] b.docx.tmp`, `c.ppt.tmp`, `d.pptx.tmp` → tương tự, đúng khu/môn.
- [ ] `.syncthing.abc.tmp` → vẫn skip, KHÔNG rename.
- [ ] `random.tmp` (không có đuôi tài liệu trước `.tmp`) → skip, để yên.
- [ ] Strip ra tên đã tồn tại trong môn → `(1)` trước đuôi, không đè.
