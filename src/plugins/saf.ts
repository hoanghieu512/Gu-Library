import { KhoUnreadableError } from '../storage/khoHidden';
import { SafNative, type SafPlugin } from './safNative';

export type { SafEntry, SafPlugin } from './safNative';

/** The code SafPlugin rejects with when a name is taken on disk but the listing does not show it. */
const HIDDEN_CODE = 'KHO_HIDDEN';

/**
 * The plugin, with KHO_HIDDEN turned into KhoUnreadableError on every call, so a write added later
 * cannot forget it and the `instanceof KhoUnreadableError` checks in the screens see it. Methods
 * are looked up on SafNative per call, which is what lets tests swap them after import.
 */
export const Saf: SafPlugin = new Proxy(SafNative, {
  get(target, prop) {
    const value: unknown = Reflect.get(target, prop);
    if (typeof value !== 'function') return value;
    return async (...args: unknown[]) => {
      try {
        return await value.apply(target, args);
      } catch (err) {
        if ((err as { code?: string } | null | undefined)?.code === HIDDEN_CODE) {
          throw new KhoUnreadableError((err as Error).message);
        }
        throw err;
      }
    };
  },
});
