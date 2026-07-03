import { useEffect, useState, useCallback } from 'react';
import { useIonToast } from '@ionic/react';
import { App } from '@capacitor/app';
import { ShareTarget, type SharedFile } from '../plugins/shareTarget';
import ChooseMonSheet from './ChooseMonSheet';
import { importSharedFile } from './inboxRepo';
import { emitKhoChanged } from '../lib/khoEvents';

// Bắt file share (cold-start + khi app resume), mở sheet chọn MỘT môn, copy CẢ LÔ
// vào _inbox với tiền tố môn đó. Một lô = một môn (thiết kế đã chốt).
export default function ShareReceiver() {
  const [batch, setBatch] = useState<SharedFile[]>([]);
  const [presentToast] = useIonToast();

  const check = useCallback(async () => {
    try {
      const { files } = await ShareTarget.getSharedFiles();
      if (files.length > 0) setBatch(files);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    check(); // cold-start
    const sub = App.addListener('resume', () => { check(); }); // warm (share khi app đang mở)
    return () => { sub.then((h) => h.remove()); };
  }, [check]);

  const pick = async (path: string[]) => {
    const files = batch;
    setBatch([]);
    if (files.length === 0) return;
    const label = path.join(' / ');
    let ok = 0;
    const fails: string[] = [];
    // Tuần tự để file trùng tên gốc được createFile tự thêm hậu tố "(1)" đúng thứ tự.
    for (const f of files) {
      try {
        await importSharedFile(f.uri, f.name, path);
        ok += 1;
      } catch {
        fails.push(f.name);
      }
    }
    if (ok > 0) emitKhoChanged(); // Home cập nhật badge ⏳ / "Chưa phân loại" ngay
    if (fails.length === 0) {
      await presentToast({
        message: `Đã thêm ${ok} file vào ${label} (chờ xử lý)`,
        duration: 2500,
      });
    } else {
      await presentToast({
        message: `Thêm ${ok}/${files.length} file vào ${label}; lỗi: ${fails.join(', ')}`,
        duration: 3500,
        color: 'danger',
      });
    }
  };

  const note = batch.length === 0
    ? null
    : batch.length === 1
      ? batch[0].name
      : `${batch.length} file`;

  return (
    <ChooseMonSheet
      isOpen={batch.length > 0}
      note={note}
      onPick={pick}
      onCancel={() => setBatch([])}
    />
  );
}
