import { render, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CrashNotice from './CrashNotice';
import { prefs } from '../test/fakePreferences';
import type { OpeningEvent } from '../opening/openingMachine';
import { finishOpening, resetOpeningForTest, subscribeOpening } from '../opening/homeReady';

vi.mock('@capacitor/preferences', () => import('../test/fakePreferences'));
const present = vi.hoisted(() => vi.fn());
vi.mock('@ionic/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ionic/react')>()),
  useIonAlert: () => [present],
}));

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
let seen: OpeningEvent[];

beforeEach(() => {
  prefs.clear();
  present.mockReset();
  resetOpeningForTest();
  seen = [];
  subscribeOpening((e) => seen.push(e));
});

describe('CrashNotice: the opening doors', () => {
  it('crash flag: skips the doors and waits for them before the alert', async () => {
    prefs.set('viewer_crash', '1');
    render(<CrashNotice />);
    await waitFor(() => expect(prefs.has('viewer_crash')).toBe(false));
    await settle();
    expect(seen).toContainEqual({ type: 'skip', reason: 'crash' });
    expect(present).not.toHaveBeenCalled();
    act(() => finishOpening());
    await waitFor(() => expect(present).toHaveBeenCalled());
  });

  it('no flag: neither a skip nor an alert', async () => {
    render(<CrashNotice />);
    await settle();
    act(() => finishOpening());
    await settle();
    expect(seen).toEqual([]);
    expect(present).not.toHaveBeenCalled();
  });
});
