import { useEffect } from 'react';
import { useIonAlert } from '@ionic/react';
import { Preferences } from '@capacitor/preferences';
import { whenOpeningDone } from '../opening/homeReady';

// Sau khi lưới an toàn native đỡ renderer chết (recreate app), Home hiện thông báo thân thiện
// giải thích + gợi ý nhập lại qua nút "+"/Share để Atomman tối ưu. Đọc + xoá cờ 'viewer_crash'.
export default function CrashNotice() {
  const [presentAlert] = useIonAlert();
  useEffect(() => {
    (async () => {
      const { value } = await Preferences.get({ key: 'viewer_crash' });
      if (!value) return;
      await Preferences.remove({ key: 'viewer_crash' });
      // Native plays no clip after a crash; the alert still waits until any opening layer is gone.
      await whenOpeningDone();
      await presentAlert({
        header: 'Tài liệu quá nặng',
        message:
          'Tài liệu vừa mở quá nặng nên máy không mở nổi và app đã tự khởi động lại. ' +
          'Hãy nhập lại đúng file đó qua nút “+” (tab Thêm) hoặc Share để Atomman tối ưu, rồi mở lại.',
        buttons: ['Đã hiểu'],
      });
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
