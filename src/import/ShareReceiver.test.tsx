import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShareReceiver from './ShareReceiver';
import { ShareTarget } from '../plugins/shareTarget';
import { skipOpening } from '../opening/homeReady';

const app = vi.hoisted(() => ({ resume: null as null | (() => void) }));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: async (_event: string, cb: () => void) => {
      app.resume = cb;
      return { remove: () => {} };
    },
  },
}));
vi.mock('../plugins/shareTarget', () => ({ ShareTarget: { getSharedFiles: vi.fn() } }));
vi.mock('./ImportDestinationFlow', () => ({ default: () => null }));
vi.mock('../opening/homeReady', () => ({ skipOpening: vi.fn() }));

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const FILE = { uri: 'content://x', name: 'a.pdf' };

beforeEach(() => {
  app.resume = null;
  vi.mocked(skipOpening).mockClear();
  vi.mocked(ShareTarget.getSharedFiles).mockReset().mockResolvedValue({ files: [] });
});

describe('ShareReceiver: the opening doors', () => {
  it('a cold share skips the doors', async () => {
    vi.mocked(ShareTarget.getSharedFiles).mockResolvedValue({ files: [FILE] });
    render(<ShareReceiver />);
    await settle();
    expect(skipOpening).toHaveBeenCalledWith('share');
  });

  it('nothing shared: the doors are left alone', async () => {
    render(<ShareReceiver />);
    await settle();
    expect(skipOpening).not.toHaveBeenCalled();
  });

  it('a share on a later resume skips again, which the finished doors ignore', async () => {
    render(<ShareReceiver />);
    await settle();
    vi.mocked(ShareTarget.getSharedFiles).mockResolvedValue({ files: [FILE] });
    await act(async () => { app.resume?.(); });
    await settle();
    expect(skipOpening).toHaveBeenCalledWith('share');
  });
});
