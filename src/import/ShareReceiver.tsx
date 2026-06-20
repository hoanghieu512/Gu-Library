import { useEffect, useState, useCallback } from 'react';
import { useIonToast } from '@ionic/react';
import { App } from '@capacitor/app';
import { ShareTarget } from '../plugins/shareTarget';
import ChooseMonSheet from './ChooseMonSheet';
import { importSharedFile } from './inboxRepo';

interface Pending { uri: string; name: string; }

// Bắt file share (cold-start + khi app resume), mở sheet chọn môn, copy vào _inbox.
export default function ShareReceiver() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [presentToast] = useIonToast();

  const check = useCallback(async () => {
    try {
      const r = await ShareTarget.getSharedFile();
      if (r.uri && r.name) setPending({ uri: r.uri, name: r.name });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    check(); // cold-start
    const sub = App.addListener('resume', () => { check(); }); // warm (share khi app đang mở)
    return () => { sub.then((h) => h.remove()); };
  }, [check]);

  const pick = async (monName: string) => {
    if (!pending) return;
    const file = pending;
    setPending(null);
    try {
      await importSharedFile(file.uri, file.name, monName);
      await presentToast({ message: `Đã thêm "${file.name}" vào ${monName} (chờ xử lý)`, duration: 2500 });
    } catch (e: unknown) {
      await presentToast({ message: 'Lỗi thêm file: ' + String(e instanceof Error ? e.message : e), duration: 3500, color: 'danger' });
    }
  };

  return (
    <ChooseMonSheet
      isOpen={pending !== null}
      fileName={pending?.name ?? null}
      onPick={pick}
      onCancel={() => setPending(null)}
    />
  );
}
