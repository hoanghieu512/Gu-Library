import { useIonToast } from '@ionic/react';
import type { SharedFile } from '../plugins/shareTarget';
import ChooseMonSheet from './ChooseMonSheet';
import { importBatch } from './inboxRepo';

// Sheet chọn đích + copy cả lô (dùng chung ShareReceiver + AddPage). batch>0 = mở sheet.
export default function ImportDestinationFlow({ batch, onClear }: { batch: SharedFile[]; onClear: () => void }) {
  const [presentToast] = useIonToast();

  const pick = async (path: string[]) => {
    const files = batch;
    onClear();
    if (files.length === 0) return;
    const label = path.join(' / ');
    const { ok, fails } = await importBatch(files, path);
    if (fails.length === 0) {
      await presentToast({ message: `Đã thêm ${ok} file vào ${label} (chờ xử lý)`, duration: 2500 });
    } else {
      await presentToast({
        message: `Thêm ${ok}/${files.length} file vào ${label}; lỗi: ${fails.join(', ')}`,
        duration: 3500, color: 'danger',
      });
    }
  };

  const note = batch.length === 0 ? null : batch.length === 1 ? batch[0].name : `${batch.length} file`;

  return <ChooseMonSheet isOpen={batch.length > 0} note={note} onPick={pick} onCancel={onClear} />;
}
