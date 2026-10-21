# File bàn giao

Phiên cloud không có vault Obsidian, không có memory trên Mac và không có máy thật. Vì vậy nó kết thúc bằng một file bàn giao trên chính nhánh của nó: `Docs/claude/handoff/<tên-nhánh>.md` (thay `/` trong tên nhánh bằng `-`, ví dụ `feat-muc-luc-dieu.md`).

Phiên local nhận nhánh thì:

1. Đọc file này trước tiên, rồi làm phần chỉ local làm được (build release, cài máy, e2e, kiểm tay).
2. Chép nội dung vào log phiên trong vault (`claude-sessions/gu-library/`).
3. Xoá file trong commit merge, để `main` không giữ các file bàn giao cũ. Lịch sử git vẫn còn.

Điều gì đáng nhớ lâu (bẫy, quyết định) thì đưa vào `Docs/claude/lessons.md`, đừng để chỉ nằm trong file bàn giao.

## Mẫu

```markdown
---
branch: feat/ten-nhanh
base: <commit của main lúc tách nhánh>
date: yyyy-mm-dd
status: ready-for-device | in-progress | blocked
---

# <Tên việc>

## Đã làm
- <commit ngắn>: <một dòng>

## Quyết định
- <quyết định>: <lý do>; hướng đã cân mà bỏ và vì sao.

## Bẫy đã gặp
- <bẫy>: <cách nhận ra, cách tránh>

## Kiểm chứng đã chạy
- `npm test`: <số test, kết quả thật>
- `npx tsc -b`, `npm run lint`: <kết quả>

## Cần kiểm trên máy (local)
- [ ] <bước kiểm tay cụ thể, máy nào, mong đợi gì>

## Còn mở, cần huynh quyết
- [ ] <câu hỏi>
```
