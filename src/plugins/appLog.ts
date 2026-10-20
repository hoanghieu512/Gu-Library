// Warnings that must be seen in a release build too. A release build prints no console output
// (Capacitor's default loggingBehavior), and turning that on would also dump every plugin call's
// payload into logcat, so each warning also goes to logcat itself through SafPlugin.logWarn, under
// the tag GuApp: `adb logcat -s GuApp`.

import { SafNative } from './safNative';

const describe = (err: unknown): string => {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  try { return JSON.stringify(err) ?? String(err); } catch { return String(err); }
};

/** console.warn, plus one line in logcat. Never throws: there is no native log on the web. */
export function logWarn(message: string, err?: unknown): void {
  console.warn(message, err);
  try {
    void SafNative.logWarn({ message: err === undefined ? message : `${message}: ${describe(err)}` }).catch(() => {});
  } catch { /* no native log here */ }
}
