import { useEffect, useState, useCallback } from 'react';
import { App } from '@capacitor/app';
import { ShareTarget, type SharedFile } from '../plugins/shareTarget';
import ImportDestinationFlow from './ImportDestinationFlow';

// Bắt file share (cold-start + resume) → mở sheet chọn đích, copy cả lô (một lô một đích).
export default function ShareReceiver() {
  const [batch, setBatch] = useState<SharedFile[]>([]);

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

  return <ImportDestinationFlow batch={batch} onClear={() => setBatch([])} />;
}
