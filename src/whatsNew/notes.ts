import type { ReleaseNote } from './types';

// What Pé reads after each update — huynh's voice, plain words, only what she can see or feel.
// Newest FIRST. Every release adds its entry here (drafted by đệ, approved by huynh); notes.test
// fails when package.json's version has none. Technical history stays in CHANGELOG.md.
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '1.44.1',
    date: '25/10/2026',
    items: [
      { kind: 'improve', text: 'Bạn panda mở cửa được làm lại: tóc giả thẩm phán gọn gàng hơn, hình nét hơn, hai cánh cửa thư viện mở ra trông thật hơn.' },
    ],
  },
  {
    version: '1.44.0',
    date: '25/10/2026',
    items: [
      { kind: 'new', text: 'Mỗi lần mở app, Pé sẽ thấy bạn panda thẩm phán ôm sách đi tới đẩy cửa thư viện, bước vào rồi quay lại vẫy chào. Vội thì chạm vào đâu cũng vào luôn Trang chủ. Không thích thì vào Cài đặt, gạt tắt "Hiệu ứng mở cửa" nha.' },
      { kind: 'improve', text: 'Lúc vừa bấm mở app không còn chớp màn trắng nữa.' },
    ],
  },
  {
    version: '1.43.1',
    date: '24/10/2026',
    items: [
      { kind: 'improve', text: 'App nhẹ hơn khi Pé chuyển qua app khác: phần dùng để tìm kiếm giờ được cất đi lúc app nằm chờ, nên điện thoại ít phải đóng app hơn, quay lại thường vẫn ở chỗ đang đọc. Vì vậy rời màn Tìm một lúc rồi quay lại sẽ thấy dòng "đang cập nhật chỉ mục…" vài giây, kết quả cũ vẫn nằm đó và chạm được như thường.' },
      { kind: 'fix', text: 'Bấm "Dựng lại chỉ mục tìm kiếm" trong Cài đặt rồi vào Tìm, trước đây nếu lúc trước Pé đã mở màn Tìm thì app vẫn tìm trên chỉ mục cũ cho tới khi tắt app mở lại. Giờ vào Tìm là app đọc lại kho ngay nha.' },
    ],
  },
  {
    version: '1.43.0',
    date: '21/10/2026',
    items: [
      { kind: 'new', text: 'Đang đọc một bộ luật, bấm nút danh sách nằm cạnh kính lúp ở dưới là ra Mục lục Điều: các Chương và Điều của chính văn bản đó, chạm một Điều là tới ngay trang của nó. Mở ra là thấy luôn mình đang đọc tới Điều nào. Slide hay giáo trình không có Điều thì không có nút này.' },
      { kind: 'new', text: 'Gõ số Điều vào ô lọc trên cùng thì Điều đúng số đứng đầu, rồi tới các Điều bắt đầu bằng số đó (gõ 3 là ra Điều 3, rồi 30, 31…).' },
      { kind: 'new', text: 'Khi chia đôi màn hình, chữ "Mục lục" trên thanh chia mở Mục lục Điều của tài liệu ở khung dưới, khung trên Pé đang đọc vẫn đứng yên.' },
    ],
  },
  {
    version: '1.42.4',
    date: '21/10/2026',
    items: [
      { kind: 'fix', text: 'Gửi nhiều file vào app đúng lúc điện thoại không đọc được kho, trước đây app chỉ báo "Không đọc được kho" mà không nói file nào đã vào rồi, nên gửi lại cả lô thì mấy file đầu bị trùng thành "(1)". Giờ app báo đã nhập được mấy file và kể tên những file cần gửi lại sau khi khởi động lại máy nha.' },
      { kind: 'fix', text: 'Đang đọc mà app lưu trang bị trục trặc, trước đây trang đó bị bỏ qua luôn, mở lại tài liệu có khi về trang cũ hơn. Giờ app tự lưu lại trong lúc Pé đọc tiếp.' },
      { kind: 'fix', text: 'Hiếm lắm mới gặp: tạo thư mục mới mà app lỡ để sót một thư mục trống tên kiểu "Slide (1)". Giờ app nói rõ tên thư mục đó để Pé xoá đi.' },
      { kind: 'improve', text: 'Bấm "Dựng lại chỉ mục tìm kiếm" trong Cài đặt giờ xong ngay, không phải đợi app đọc qua cả kho trước.' },
    ],
  },
  {
    version: '1.42.3',
    date: '18/10/2026',
    items: [
      { kind: 'fix', text: 'Có lúc điện thoại khởi động bị lỗi, app không đọc được folder kho: Trang chủ trống trơn như mất hết môn, còn file gửi vào app thì nằm nhầm chỗ, máy tính không thấy. Giờ gặp lúc đó app báo "Không đọc được kho", nhắc Pé khởi động lại máy, và không ghi gì vào kho. Khởi động lại rồi mở app là đâu vào đấy nha.' },
      { kind: 'fix', text: 'Lúc lưu hay chuyển tài liệu, bấm "Thư mục mới" gõ tên trùng thư mục đã có chỉ khác chữ hoa chữ thường (như "slide" khi đã có "Slide"), trước đây app tạo thêm "slide (1)" rồi bỏ tài liệu vào đó. Giờ app báo "Đã tồn tại" luôn.' },
    ],
  },
  {
    version: '1.42.2',
    date: '16/10/2026',
    items: [
      { kind: 'fix', text: 'Tìm trong tài liệu mà gõ "điều 3", trước đây các Điều 30, 31, 312… lại hiện lên đầu, phải kéo xuống giữa mới gặp đúng Điều 3. Giờ Điều 3 nằm trên cùng rồi nha, các điều có số dài hơn xếp sau. Ở màn Tìm cũng vậy.' },
    ],
  },
  {
    version: '1.42.1',
    date: '14/10/2026',
    items: [
      { kind: 'fix', text: 'Đọc slide cuộn tới tận cuối mà số trang dưới chân vẫn ghi trang áp chót, nên slide đọc xong rồi cứ nằm hoài ở "Đang đọc dở". Giờ cuộn tới cuối là tính đọc xong nha.' },
      { kind: 'improve', text: 'Trong bảng này, chữ các dòng giờ thẳng hàng với nhau, dễ đọc hơn.' },
      { kind: 'improve', text: 'Dòng "Có gì mới" trong Cài đặt giờ là một thẻ như các mục khác, dễ thấy để bấm.' },
    ],
  },
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
