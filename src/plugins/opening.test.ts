import { describe, it, expect } from 'vitest';
import { Opening } from './opening';

describe('Opening plugin', () => {
  // jsdom runs as the web platform: there is no clip there, so nothing must wait on one.
  it('web: homeReady and whenDone resolve at once', async () => {
    await expect(Opening.homeReady()).resolves.toBeUndefined();
    await expect(Opening.whenDone()).resolves.toBeUndefined();
  });
});
