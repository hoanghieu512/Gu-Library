import { useState } from 'react';
import { useIonToast, IonLoading } from '@ionic/react';
import type { SharedFile } from '../plugins/shareTarget';
import ChooseMonSheet from './ChooseMonSheet';
import { importBatch } from './inboxRepo';
import { perfStart, perfEnd } from '../perf/perf';

// Sheet chọn đích + copy cả lô (dùng chung ShareReceiver + AddPage). batch>0 = mở sheet.
export default function ImportDestinationFlow({ batch, onClear }: { batch: SharedFile[]; onClear: () => void }) {
  const [presentToast] = useIonToast();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const pick = async (path: string[]) => { // import chỉ cần path (prefix); bỏ qua destUri
    const files = batch;
    onClear();
    if (files.length === 0) return;
    const label = path.join(' / ');
    // Trạng thái tiến hành nhìn thấy được: file nguồn cloud (Drive…) copy = tải mạng trong stream,
    // có thể lâu — cho người dùng thấy nó đang về (vật lý mạng không nén được, chỉ nén được mù mờ).
    setMsg(files.length > 1 ? `Đang nhập 0/${files.length}…` : 'Đang nhập…');
    setBusy(true);
    perfStart('importBatch'); // đo copy cả lô vào _inbox (⏳ xuất hiện khi copy xong)
    const { ok, fails } = await importBatch(files, path, (done, total) => {
      setMsg(total > 1 ? `Đang nhập ${done}/${total}…` : 'Đang nhập…');
    });
    perfEnd('importBatch');
    setBusy(false);
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

  return (
    <>
      <ChooseMonSheet isOpen={batch.length > 0} note={note} onPick={pick} onCancel={onClear} />
      <IonLoading isOpen={busy} message={msg} />
    </>
  );
}
