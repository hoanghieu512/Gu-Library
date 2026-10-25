import { render, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CrashNotice from './CrashNotice';
import { prefs } from '../test/fakePreferences';
import { Opening } from '../plugins/opening';
import { resetOpeningForTest } from '../opening/homeReady';

vi.mock('@capacitor/preferences', () => import('../test/fakePreferences'));
vi.mock('../plugins/opening', () => ({ Opening: { homeReady: vi.fn(), whenDone: vi.fn() } }));
const present = vi.hoisted(() => vi.fn());
vi.mock('@ionic/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ionic/react')>()),
  useIonAlert: () => [present],
}));

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
let finishClip: () => void;

beforeEach(() => {
  prefs.clear();
  present.mockReset();
  resetOpeningForTest();
  vi.mocked(Opening.whenDone).mockReset().mockReturnValue(new Promise<void>((r) => { finishClip = r; }));
});

describe('CrashNotice: the opening clip', () => {
  // Native never plays the clip after a crash, but the alert still waits until the layer is gone.
  it('crash flag: the alert waits for the clip to be done', async () => {
    prefs.set('viewer_crash', '1');
    render(<CrashNotice />);
    await waitFor(() => expect(prefs.has('viewer_crash')).toBe(false));
    await settle();
    expect(present).not.toHaveBeenCalled();
    act(() => finishClip());
    await waitFor(() => expect(present).toHaveBeenCalled());
  });

  it('no flag: no alert', async () => {
    render(<CrashNotice />);
    act(() => finishClip());
    await settle();
    expect(present).not.toHaveBeenCalled();
  });
});
