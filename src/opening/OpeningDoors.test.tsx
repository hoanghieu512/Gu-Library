import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OpeningDoors from './OpeningDoors';
import { getOpeningEnabled } from './openingPref';
import { FAST_MS, FALLBACK_SLACK_MS, OPEN_MS } from './openingMachine';
import { markHomeReady, skipOpening, whenOpeningDone, resetOpeningForTest } from './homeReady';

vi.mock('./openingPref', () => ({ getOpeningEnabled: vi.fn() }));

const flush = () => act(() => vi.advanceTimersByTimeAsync(0));
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const btn = () => screen.queryByRole('button', { name: 'Bỏ qua hiệu ứng mở cửa' });
const stateOf = () => btn()?.className.match(/gu-opening--(\w+)/)?.[1] ?? null;
let reduced = false;

async function isDone(): Promise<boolean> {
  let resolved = false;
  whenOpeningDone().then(() => { resolved = true; });
  await flush();
  return resolved;
}

function backEvent(register: (p: number, h: (next: () => void) => void) => void) {
  act(() => { document.dispatchEvent(new CustomEvent('ionBackButton', { detail: { register } })); });
}

beforeEach(() => {
  vi.useFakeTimers();
  resetOpeningForTest();
  reduced = false;
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  vi.mocked(getOpeningEnabled).mockReset().mockResolvedValue(true);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  delete (HTMLImageElement.prototype as { decode?: unknown }).decode;
});

describe('OpeningDoors: when it does not play', () => {
  it('switch off: no doors, done at once', async () => {
    vi.mocked(getOpeningEnabled).mockResolvedValue(false);
    render(<OpeningDoors />);
    await flush();
    expect(btn()).toBeNull();
    expect(await isDone()).toBe(true);
  });

  it('reduced motion: no doors', async () => {
    reduced = true;
    render(<OpeningDoors />);
    await flush();
    expect(btn()).toBeNull();
    expect(await isDone()).toBe(true);
  });

  it('read error: no doors', async () => {
    vi.mocked(getOpeningEnabled).mockRejectedValue(new Error('storage gone'));
    render(<OpeningDoors />);
    await flush();
    expect(btn()).toBeNull();
    expect(await isDone()).toBe(true);
  });

  it('image decode failure: no doors', async () => {
    Object.defineProperty(HTMLImageElement.prototype, 'decode', {
      value: () => Promise.reject(new Error('bad image')), configurable: true,
    });
    render(<OpeningDoors />);
    await flush();
    expect(btn()).toBeNull();
    expect(await isDone()).toBe(true);
  });

  it('read that never settles: gone at the deadline, doors never shown', async () => {
    vi.mocked(getOpeningEnabled).mockReturnValue(new Promise(() => {}));
    render(<OpeningDoors />);
    await advance(2499);
    expect(stateOf()).toBe('cover');
    await advance(1);
    expect(btn()).toBeNull();
  });

  it('skip before mount: no doors', async () => {
    skipOpening('share');
    render(<OpeningDoors />);
    await flush();
    expect(btn()).toBeNull();
  });
});

describe('OpeningDoors: playing', () => {
  it('opens after Home ready and 400 ms, then leaves the DOM', async () => {
    render(<OpeningDoors />);
    await flush();
    expect(stateOf()).toBe('closed');
    await advance(399);
    expect(stateOf()).toBe('closed');
    act(() => markHomeReady());
    await advance(1);
    expect(stateOf()).toBe('opening');
    await advance(OPEN_MS + FALLBACK_SLACK_MS);
    expect(btn()).toBeNull();
    expect(await isDone()).toBe(true);
  });

  it('Home ready early still waits 400 ms', async () => {
    markHomeReady();
    render(<OpeningDoors />);
    await flush();
    await advance(399);
    expect(stateOf()).toBe('closed');
    await advance(1);
    expect(stateOf()).toBe('opening');
  });

  it('deadline opens without Home ready', async () => {
    render(<OpeningDoors />);
    await flush();
    await advance(2499);
    expect(stateOf()).toBe('closed');
    await advance(1);
    expect(stateOf()).toBe('opening');
  });

  it('shows the plaque and the panda once the doors are up', async () => {
    render(<OpeningDoors />);
    await flush();
    expect(screen.getByText("Gú's Library")).toBeInTheDocument();
    expect(btn()!.querySelector('img.gu-opening__panda')).not.toBeNull();
  });
});

describe('OpeningDoors: skipping', () => {
  it('tap on the doors fast-opens', async () => {
    render(<OpeningDoors />);
    await flush();
    fireEvent.click(btn()!);
    expect(stateOf()).toBe('fastOpen');
    await advance(FAST_MS + FALLBACK_SLACK_MS);
    expect(btn()).toBeNull();
  });

  it('tap on the cover goes straight to Home', async () => {
    vi.mocked(getOpeningEnabled).mockReturnValue(new Promise(() => {}));
    render(<OpeningDoors />);
    await flush();
    expect(stateOf()).toBe('cover');
    fireEvent.click(btn()!);
    expect(btn()).toBeNull();
  });

  it('back button skips at priority 110 and swallows the press', async () => {
    render(<OpeningDoors />);
    await flush();
    const register = vi.fn();
    backEvent(register);
    expect(register).toHaveBeenCalledWith(110, expect.any(Function));
    const processNext = vi.fn();
    act(() => register.mock.calls[0][1](processNext));
    expect(stateOf()).toBe('fastOpen');
    expect(processNext).not.toHaveBeenCalled();
  });

  it('back button after the doors are gone is not intercepted', async () => {
    render(<OpeningDoors />);
    await flush();
    fireEvent.click(btn()!);
    await advance(FAST_MS + FALLBACK_SLACK_MS);
    expect(btn()).toBeNull();
    const register = vi.fn();
    backEvent(register);
    expect(register).not.toHaveBeenCalled();
  });
});

describe('OpeningDoors: lifecycle', () => {
  it('unmount mid-way leaves no timers and finishes', async () => {
    const { unmount } = render(<OpeningDoors />);
    await flush();
    expect(stateOf()).toBe('closed');
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(await isDone()).toBe(true);
  });

  it('nothing brings it back after done', async () => {
    vi.mocked(getOpeningEnabled).mockResolvedValue(false);
    render(<OpeningDoors />);
    await flush();
    expect(btn()).toBeNull();
    act(() => { markHomeReady(); skipOpening('tap'); });
    await advance(3000);
    expect(btn()).toBeNull();
  });
});
