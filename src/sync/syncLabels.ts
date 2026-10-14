import { checkmarkCircle, syncCircle, warningOutline, settingsOutline } from 'ionicons/icons';
import type { SyncState } from './useSyncStatus';

// The one set of sync labels, icons and colours: the Home pill and the Settings card both read it,
// so there is never a second wording for the same state.
export const SYNC_MAP: Record<SyncState, { icon: string; color: string; label: string }> = {
  synced: { icon: checkmarkCircle, color: 'success', label: 'Đã đồng bộ' },
  syncing: { icon: syncCircle, color: 'warning', label: 'Đang đẩy…' },
  offline: { icon: warningOutline, color: 'danger', label: 'Chưa thấy Atomman' },
  unconfigured: { icon: settingsOutline, color: 'medium', label: 'Chưa cấu hình' },
};
