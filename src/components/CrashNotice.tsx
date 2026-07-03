import { useEffect } from 'react';
import { useIonAlert } from '@ionic/react';
import { Preferences } from '@capacitor/preferences';

// Sau khi lưới an toàn native đỡ renderer chết (recreate app), Home hiện thông báo thân thiện
// giải thích + gợi ý nhập lại qua nút "+"/Share để mini PC tối ưu. Đọc + xoá cờ 'viewer_crash'.
export default function CrashNotice() {
  const [presentAlert] = useIonAlert();
  useEffect(() => {
    (async () => {
      const { value } = await Preferences.get({ key: 'viewer_crash' });
      if (!value) return;
      await Preferences.remove({ key: 'viewer_crash' });
      await presentAlert({
        header: 'Tài liệu quá nặng',
        message:
          'Tài liệu vừa mở quá nặng nên máy không mở nổi và app đã tự khởi động lại. ' +
          'Hãy nhập lại đúng file đó qua nút “+” (tab Thêm) hoặc Share để mini PC tối ưu, rồi mở lại.',
        buttons: ['Đã hiểu'],
      });
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
