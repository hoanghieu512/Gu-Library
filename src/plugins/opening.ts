import { registerPlugin } from '@capacitor/core';

// The native opening clip (android/.../OpeningOverlay.java, spec 2026-10-25-mo-cua-video-design.md).
// JS only reports that Home has drawn and waits for the clip's layer to leave. On the web (dev
// server, jsdom tests) there is no clip, so both resolve at once.
export interface OpeningPlugin {
  /** Home has drawn: the clip may fade out once it is over. */
  homeReady(): Promise<void>;
  /** Resolves when the clip's layer has left (at once if it never played). */
  whenDone(): Promise<void>;
}

export const Opening = registerPlugin<OpeningPlugin>('Opening', {
  web: {
    homeReady: async () => {},
    whenDone: async () => {},
  },
});
