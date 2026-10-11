import type { ReleaseNote } from './types';

// What Pé reads after each update — huynh's voice, plain words, only what she can see or feel.
// Newest FIRST. Every release adds its entry here (drafted by đệ, approved by huynh); notes.test
// fails when package.json's version has none. Technical history stays in CHANGELOG.md.
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '1.42.0',
    date: '11/10/2026',
    items: [
      { kind: 'new', text: 'Từ giờ mỗi lần app có bản mới, Pé sẽ thấy bảng này kể có gì thay đổi. Muốn xem lại thì vào Cài đặt, bấm dòng "Có gì mới" ở cuối.' },
    ],
  },
  {
    version: '1.41.1',
    date: '10/10/2026',
    items: [
      { kind: 'fix', text: 'Pé đọc slide, thoát ra rồi mở lại hay bị nhảy sang trang sau? Giờ hết rồi nha, mở lại đúng trang đang đọc.' },
      { kind: 'fix', text: 'Gõ số trang vào ô "Tới trang" rồi bấm "Nhảy" tới trang cuối, có lúc số trang hiện ở dưới lại ghi trang áp chót. Giờ ghi đúng rồi.' },
      { kind: 'improve', text: 'Tài liệu nào Pé đã đổi tên thì ở màn Tìm cũng hiện tên mới, không còn tên file cũ.' },
      { kind: 'fix', text: 'Dán nguyên một đoạn văn dài vào ô Tìm giờ vẫn tìm ra, không còn trống trơn.' },
    ],
  },
  {
    version: '1.41.0',
    date: '06/10/2026',
    items: [
      { kind: 'new', text: 'Màn Tìm giờ gom kết quả theo từng tài liệu: mỗi thẻ là một tài liệu, ghi có bao nhiêu đoạn khớp kèm một đoạn trích tiêu biểu.' },
      { kind: 'new', text: 'Bấm "Xem cả … đoạn" trên thẻ là mở tài liệu với ô tìm trong tài liệu bật sẵn, Pé xem lần lượt từng đoạn.' },
      { kind: 'fix', text: 'Tra từ hay gặp như "hợp đồng", "điều tra" trước đây chỉ ra tài liệu của môn đứng đầu danh sách. Giờ tìm khắp kho, tài liệu nói nhiều về chủ đề đó đứng trước.' },
      { kind: 'fix', text: 'Bấm vào một kết quả khi tài liệu dày chưa mở xong có lúc nhảy sai trang. Giờ mở đúng trang.' },
    ],
  },
];
