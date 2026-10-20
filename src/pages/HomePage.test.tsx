import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IonApp, IonRouterOutlet } from '@ionic/react';
import { IonReactMemoryRouter } from '@ionic/react-router';
import { createMemoryHistory } from 'history';
import { Route } from 'react-router-dom';
import { SafNative } from '../plugins/safNative';
import { fakeKho, ROOT, type FakeKho } from '../test/fakeSaf';
import { invalidateKho } from '../storage/khoSnapshot';
import HomePage from './HomePage';

const prefs = vi.hoisted(() => new Map<string, string>());
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: prefs.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => { prefs.set(key, value); },
    remove: async ({ key }: { key: string }) => { prefs.delete(key); },
  },
}));
vi.mock('@capacitor/app', () => ({ App: { addListener: async () => ({ remove: () => {} }) } }));
vi.mock('../plugins/safNative', () => ({ SafNative: {} }));
vi.mock('../sync/useSyncStatus', () => ({ useSyncStatus: () => ({ light: 'unconfigured', refresh: () => {} }) }));

// MonShelf measures the shelf; jsdom has no ResizeObserver.
vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });

let kho: FakeKho;
beforeEach(() => {
  prefs.clear();
  prefs.set('saf_root_uri', ROOT);
  prefs.set('device_id', 'test-device');
  kho = fakeKho();
  Object.assign(SafNative, kho.saf);
  kho.mkdir('Logic');
  kho.mkdir('_inbox');
  invalidateKho();
});

function renderHome() {
  render(
    <IonApp>
      <IonReactMemoryRouter history={createMemoryHistory({ initialEntries: ['/home'] })}>
        <IonRouterOutlet>
          <Route exact path="/home" component={HomePage} />
        </IonRouterOutlet>
      </IonReactMemoryRouter>
    </IonApp>,
  );
}

describe('HomePage: a kho Android will not list', () => {
  it('shows the subjects of a kho that lists', async () => {
    renderHome();
    expect(await screen.findByText('Môn học')).toBeInTheDocument();
    expect(screen.queryByText(/Khởi động lại máy/)).not.toBeInTheDocument();
  });

  // dGen1, 2026-10-17: the shelf came up empty as if the kho had no subjects at all.
  it('tells Gú to restart the phone and offers no way to write', async () => {
    kho.state.hideAll = true;
    kho.state.rejectHidden = true;
    renderHome();
    expect(await screen.findByText(/Khởi động lại máy/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Tạo môn mới')).not.toBeInTheDocument();
    expect(screen.queryByText('Chưa có môn nào trong kho.')).not.toBeInTheDocument();
  });
});
