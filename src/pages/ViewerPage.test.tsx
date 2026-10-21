import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { IonApp, IonRouterOutlet } from '@ionic/react';
import { IonReactMemoryRouter } from '@ionic/react-router';
import { createMemoryHistory } from 'history';
import { Route } from 'react-router-dom';
import { encodeUriParam } from '../storage/uriParam';
import { buildToc } from '../viewer/dieuToc';
import { loadToc } from '../viewer/loadToc';
import ViewerPage from './ViewerPage';

vi.mock('@capacitor/preferences', () => import('../test/fakePreferences'));
vi.mock('../plugins/safNative', () => ({ SafNative: {} }));
// IonModal does not run in jsdom; the shell only decides whether children are shown.
vi.mock('../components/GuSheet', () => ({
  default: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => (isOpen ? <div>{children}</div> : null),
}));
// The real pane reads the PDF and needs pdf.js; this one lets the test say when the first page has
// painted and which page is in view, and shows the last jump it was given.
vi.mock('../components/DocPane', () => ({
  default: ({ docUri, onFirstPaint, onPageChange, jumpTo }: {
    docUri: string; onFirstPaint?: () => void; onPageChange?: (page: number, total: number) => void; jumpTo?: { page: number };
  }) => (
    <div data-testid={`pane:${docUri}`} data-jump={jumpTo?.page ?? ''}>
      <button type="button" onClick={() => onFirstPaint?.()}>{`painted:${docUri}`}</button>
      <button type="button" onClick={() => onPageChange?.(4, 50)}>{`page4:${docUri}`}</button>
    </div>
  ),
}));
vi.mock('../components/DocPicker', () => ({
  default: ({ onPick }: { onPick: (uri: string) => void }) => (
    <>
      <button type="button" onClick={() => onPick('uri://tra.pdf')}>pick</button>
      <button type="button" onClick={() => onPick('uri://khac.pdf')}>pick other</button>
    </>
  ),
}));
vi.mock('../viewer/loadToc', () => ({ loadToc: vi.fn() }));
vi.mock('../reading/store', async (orig) => ({
  ...(await orig<typeof import('../reading/store')>()),
  getResumePage: async () => 1,
  recordProgressBestEffort: async () => true,
}));
vi.mock('../viewer/fontScale', async (orig) => ({
  ...(await orig<typeof import('../viewer/fontScale')>()), getBaseScale: async () => 1,
}));
vi.mock('../storage/docRepo', async (orig) => ({
  ...(await orig<typeof import('../storage/docRepo')>()), resolveDocDisplayName: async () => null,
}));
vi.mock('../print/printRepo', async (orig) => ({
  ...(await orig<typeof import('../print/printRepo')>()), isPrintFlagged: async () => false,
}));

const entries = buildToc({
  kind: 'legal',
  units: [
    { type: 'dieu', label: 'Điều 1', path: ['Chương I', 'Điều 1'], page: 1, text: 'Điều 1. Phạm vi điều chỉnh' },
    { type: 'dieu', label: 'Điều 2', path: ['Chương I', 'Điều 2'], page: 2, text: 'Điều 2. Đối tượng áp dụng' },
    { type: 'dieu', label: 'Điều 3', path: ['Chương II', 'Điều 3'], page: 4, text: 'Điều 3. Áp dụng luật' },
    { type: 'dieu', label: 'Điều 30', path: ['Chương II', 'Điều 30'], page: 20, text: 'Điều 30. Tài sản góp vốn' },
  ],
});

// The load of uri://khac.pdf waits until the test resolves it.
let resolveKhac: (v: typeof entries) => void;
beforeEach(() => {
  // ViewerPage measures its frame for the split; jsdom has no ResizeObserver.
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.mocked(loadToc).mockReset();
  vi.mocked(loadToc).mockImplementation((uri) => {
    if (uri === 'uri://khac.pdf') return new Promise((res) => { resolveKhac = res; });
    return Promise.resolve(uri === 'uri://slide.pdf' ? [] : entries);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function openViewer(uri: string) {
  render(
    <IonApp>
      <IonReactMemoryRouter history={createMemoryHistory({ initialEntries: [`/viewer/${encodeUriParam(uri)}`] })}>
        <IonRouterOutlet>
          <Route exact path="/viewer/:uri" component={ViewerPage} />
        </IonRouterOutlet>
      </IonReactMemoryRouter>
    </IonApp>,
  );
}
const click = (text: string) => fireEvent.click(screen.getByText(text));

describe('ViewerPage: Mục lục Điều', () => {
  it('shows the button only after the first paint, for a document with Điều', async () => {
    openViewer('uri://luat.pdf');
    await screen.findByTestId('pane:uri://luat.pdf');
    expect(screen.queryByLabelText('Mục lục Điều')).toBeNull();
    expect(loadToc).not.toHaveBeenCalled();
    click('painted:uri://luat.pdf');
    expect(await screen.findByLabelText('Mục lục Điều')).toBeInTheDocument();
    expect(loadToc).toHaveBeenCalledWith('uri://luat.pdf');
  });

  it('no button for a document without Điều', async () => {
    openViewer('uri://slide.pdf');
    await screen.findByTestId('pane:uri://slide.pdf');
    click('painted:uri://slide.pdf');
    await waitFor(() => expect(loadToc).toHaveBeenCalledWith('uri://slide.pdf'));
    await act(async () => { await vi.mocked(loadToc).mock.results[0].value; });
    expect(screen.queryByLabelText('Mục lục Điều')).toBeNull();
  });

  it('jumps the top pane and marks its page', async () => {
    openViewer('uri://luat.pdf');
    await screen.findByTestId('pane:uri://luat.pdf');
    click('painted:uri://luat.pdf');
    click('page4:uri://luat.pdf');
    fireEvent.click(await screen.findByLabelText('Mục lục Điều'));
    const row = screen.getByRole('button', { name: 'Nhảy tới Điều 3, trang 4' });
    expect(within(row).getByText('đang đọc')).toBeInTheDocument();
    fireEvent.click(row);
    expect(screen.getByTestId('pane:uri://luat.pdf')).toHaveAttribute('data-jump', '4');
  });

  it('split: the divider button serves the bottom pane, and swapping drops it', async () => {
    openViewer('uri://luat.pdf');
    await screen.findByTestId('pane:uri://luat.pdf');
    click('painted:uri://luat.pdf');
    fireEvent.click(screen.getByLabelText('Chia đôi màn hình'));
    click('pick');
    await screen.findByTestId('pane:uri://tra.pdf');
    expect(screen.queryByLabelText('Mục lục Điều của tài liệu tra cứu')).toBeNull();

    click('painted:uri://tra.pdf');
    fireEvent.click(await screen.findByLabelText('Mục lục Điều của tài liệu tra cứu'));
    fireEvent.click(screen.getByRole('button', { name: 'Nhảy tới Điều 30, trang 20' }));
    expect(screen.getByTestId('pane:uri://tra.pdf')).toHaveAttribute('data-jump', '20');
    expect(screen.getByTestId('pane:uri://luat.pdf')).toHaveAttribute('data-jump', '');

    fireEvent.click(screen.getByLabelText('Đổi tài liệu tra cứu'));
    expect(screen.queryByLabelText('Mục lục Điều của tài liệu tra cứu')).toBeNull();
  });

  // Split opened with uri://tra.pdf in the bottom pane, its first page painted, its button shown.
  async function splitWithTra() {
    openViewer('uri://luat.pdf');
    await screen.findByTestId('pane:uri://luat.pdf');
    fireEvent.click(screen.getByLabelText('Chia đôi màn hình'));
    click('pick');
    await screen.findByTestId('pane:uri://tra.pdf');
    click('painted:uri://tra.pdf');
    await screen.findByLabelText('Mục lục Điều của tài liệu tra cứu');
  }

  it('picking the same reference document again waits for its first paint', async () => {
    await splitWithTra();
    const loads = vi.mocked(loadToc).mock.calls.length;
    fireEvent.click(screen.getByLabelText('Đổi tài liệu tra cứu'));
    click('pick');
    await screen.findByTestId('pane:uri://tra.pdf');
    expect(screen.queryByLabelText('Mục lục Điều của tài liệu tra cứu')).toBeNull();
    expect(loadToc).toHaveBeenCalledTimes(loads);
    click('painted:uri://tra.pdf');
    expect(await screen.findByLabelText('Mục lục Điều của tài liệu tra cứu')).toBeInTheDocument();
  });

  it('a new reference document never shows the previous table', async () => {
    await splitWithTra();
    fireEvent.click(screen.getByLabelText('Đổi tài liệu tra cứu'));
    click('pick other');
    await screen.findByTestId('pane:uri://khac.pdf');
    expect(screen.queryByLabelText('Mục lục Điều của tài liệu tra cứu')).toBeNull();
    click('painted:uri://khac.pdf');
    await waitFor(() => expect(loadToc).toHaveBeenCalledWith('uri://khac.pdf'));
    expect(screen.queryByLabelText('Mục lục Điều của tài liệu tra cứu')).toBeNull();
    await act(async () => { resolveKhac(entries); });
    expect(await screen.findByLabelText('Mục lục Điều của tài liệu tra cứu')).toBeInTheDocument();
  });
});
