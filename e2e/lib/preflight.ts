// Pure checks behind scripts/preflight.ts: stop before the e2e run when the run could only fail
// for setup reasons, and say how to fix it (in Vietnamese — the README's language).

export interface AdbDevice { serial: string; model: string; state: string }

export const APP_ID = 'com.gulibrary.app';

/** `adb devices -l` → devices with their model (agent-device names a device by its model). */
export function parseAdbDevices(out: string): AdbDevice[] {
  const devices: AdbDevice[] = [];
  for (const line of out.split('\n')) {
    const m = /^(\S+)\s+(device|unauthorized|offline)\b(.*)$/.exec(line.trim());
    if (!m) continue;
    const model = /\bmodel:(\S+)/.exec(m[3])?.[1] ?? '';
    devices.push({ serial: m[1], model, state: m[2] });
  }
  return devices;
}

/** `dumpsys package <app>` → versionName, or null when the app is not installed. */
export function parseVersionName(dumpsys: string): string | null {
  return /versionName=(\S+)/.exec(dumpsys)?.[1] ?? null;
}

export function preflightErrors(i: {
  env: Record<string, string | undefined>;
  /** null when adb itself could not be run (not installed / not on PATH). */
  devices: AdbDevice[] | null;
  deviceName: string;
  versionName: string | null;
}): string[] {
  const errors: string[] = [];
  if (!i.env.OPENROUTER_API_KEY) {
    errors.push('Thiếu OPENROUTER_API_KEY — thêm `export OPENROUTER_API_KEY=…` vào ~/.bash_profile rồi mở shell mới (e2e không đọc .env).');
  }
  if (!i.devices) {
    errors.push('Không chạy được adb — cài Android platform-tools, hoặc đặt ANDROID_HOME trỏ tới Android SDK.');
    return errors;
  }
  const device = i.devices.find((d) => d.model === i.deviceName);
  if (!device) {
    errors.push(`Không thấy máy "${i.deviceName}" trong adb devices — cắm cáp, mở khoá máy, hoặc đặt E2E_DEVICE đúng tên (model).`);
  } else if (device.state !== 'device') {
    errors.push(`Máy "${i.deviceName}" đang ở trạng thái ${device.state} — bấm "Cho phép" gỡ lỗi USB trên máy.`);
  } else if (!i.versionName) {
    errors.push(`Chưa cài ${APP_ID} trên "${i.deviceName}" — cài APK release cần kiểm trước khi chạy.`);
  }
  return errors;
}
