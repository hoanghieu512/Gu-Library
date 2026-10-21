import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IonApp, IonRouterOutlet } from '@ionic/react';
import { IonReactMemoryRouter } from '@ionic/react-router';
import { createMemoryHistory } from 'history';
import { Route } from 'react-router-dom';
import { clearIndex, loadIndex, refreshIndex } from '../search/store';
import { HOLD_MS } from '../search/indexHold';
import { indexDoc, mergeShards } from '../search/invertedIndex';
import SearchPage from './SearchPage';

// In jsdom Ionic does not fire useIonViewDidLeave when another page is pushed (only late, on the way
// back), so the test fires the page's lifecycle and the app's pause/resume itself. That Ionic and
// Capacitor really fire them is checked on the phones.
const life = vi.hoisted(() => ({ enter: () => {}, leave: () => {} }));
const app = vi.hoisted(() => ({} as Record<string, () => void>));
vi.mock('@ionic/react', async (orig) => ({
  ...(await orig<typeof import('@ionic/react')>()),
  useIonViewWillEnter: (cb: () => void) => { life.enter = cb; },
  useIonViewDidLeave: (cb: () => void) => { life.leave = cb; },
}));
vi.mock('@capacitor/app', () => ({
  App: { addListener: async (ev: string, cb: () => void) => { app[ev] = cb; return { remove() {} }; } },
}));
vi.mock('@capacitor/preferences', () => import('../test/fakePreferences'));
vi.mock('../plugins/safNative', () => ({ SafNative: {} }));
// The real clearIndex and onIndexCleared; only the loads are under the test's control.
vi.mock('../search/store', async (orig) => ({
  ...(await orig<typeof import('../search/store')>()),
  loadIndex: vi.fn(),
  refreshIndex: vi.fn(),
}));

type Load = Awaited<ReturnType<typeof loadIndex>>;
type Refresh = Awaited<ReturnType<typeof refreshIndex>>;

const DOC = { pdfUri: 'u:a.pdf', name: 'Luật Đất đai', mon: 'Đất Đai' };
const index = mergeShards([indexDoc(DOC, {
  units: [{ label: 'Điều 5', page: 3, text: 'Người sử dụng đất được cấp giấy chứng nhận.' }],
})]);
const cached: NonNullable<Load> = { index, builtAt: 1, stamps: new Map([['u:a.json', '1:1']]) };
const unchanged: Refresh = { changed: false, names: new Map(), read: 0, reused: 1, total: 1, ms: 0 };

beforeEach(() => {
  // A callback left by the previous test's page must never stand in for this one's.
  life.enter = () => {};
  life.leave = () => {};
  for (const k of Object.keys(app)) delete app[k];
  vi.mocked(loadIndex).mockReset().mockImplementation(async () => cached);
  vi.mocked(refreshIndex).mockReset().mockImplementation(async () => unchanged);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** The next loadIndex waits until the test resolves it. */
function holdNextLoad() {
  let resolve!: (v: Load) => void;
  vi.mocked(loadIndex).mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
  return (v: Load) => act(async () => { resolve(v); });
}

async function searchFor(q: string) {
  render(
    <IonApp>
      <IonReactMemoryRouter history={createMemoryHistory({ initialEntries: ['/search'] })}>
        <IonRouterOutlet>
          <Route exact path="/search" component={SearchPage} />
        </IonRouterOutlet>
      </IonReactMemoryRouter>
    </IonApp>,
  );
  await waitFor(() => expect(refreshIndex).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText('Tìm trong tài liệu'), { target: { value: q } });
  await screen.findByText('Luật Đất đai');
}

function leaveFor(ms: number) {
  vi.useFakeTimers();
  act(() => { life.leave(); vi.advanceTimersByTime(ms); });
  vi.useRealTimers();
}

describe('SearchPage: releasing the index', () => {
  it('coming back after three minutes reloads under the old results', async () => {
    await searchFor('dat');
    leaveFor(HOLD_MS);
    const resolve = holdNextLoad();
    act(() => life.enter());
    expect(screen.getByText('đang cập nhật chỉ mục…')).toBeInTheDocument();
    expect(screen.getByText('Luật Đất đai')).toBeInTheDocument();
    await waitFor(() => expect(loadIndex).toHaveBeenCalledTimes(2));
    await resolve(cached);
    expect(await screen.findByText('1 đoạn · 1 tài liệu')).toBeInTheDocument();
  });

  it('coming back within three minutes keeps the index', async () => {
    await searchFor('dat');
    leaveFor(HOLD_MS - 1);
    act(() => life.enter());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(loadIndex).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('đang cập nhật chỉ mục…')).toBeNull();
  });

  it('pause on Search releases at once and resume reloads', async () => {
    await searchFor('dat');
    act(() => app.pause());
    act(() => app.resume());
    await waitFor(() => expect(loadIndex).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Luật Đất đai')).toBeInTheDocument();
  });

  it('a new query typed while reloading hides the old results', async () => {
    await searchFor('dat');
    leaveFor(HOLD_MS);
    const resolve = holdNextLoad();
    act(() => life.enter());
    fireEvent.change(screen.getByLabelText('Tìm trong tài liệu'), { target: { value: 'nguoi su dung' } });
    expect(screen.queryByText('Luật Đất đai')).toBeNull();
    expect(screen.queryByText('Không tìm thấy đoạn nào')).toBeNull();
    await waitFor(() => expect(loadIndex).toHaveBeenCalledTimes(2));
    await resolve(cached);
    expect(await screen.findByText('Luật Đất đai')).toBeInTheDocument();
  });

  it('clearing the index makes the next entry build', async () => {
    await searchFor('dat');
    act(() => life.leave());
    await act(async () => { await clearIndex(); });
    vi.mocked(loadIndex).mockImplementationOnce(async () => null);
    vi.mocked(refreshIndex).mockImplementationOnce(() => new Promise(() => {}));
    act(() => life.enter());
    expect(await screen.findByText('Đang đọc kho lần đầu nha dợ iu')).toBeInTheDocument();
    expect(vi.mocked(refreshIndex).mock.lastCall).toEqual([undefined, expect.any(Function)]);
  });
});
