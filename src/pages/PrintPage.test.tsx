import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IonApp, IonRouterOutlet } from '@ionic/react';
import { IonReactMemoryRouter } from '@ionic/react-router';
import { createMemoryHistory } from 'history';
import { Route } from 'react-router-dom';
import { SafNative } from '../plugins/safNative';
import { fakeKho, ROOT, type FakeKho } from '../test/fakeSaf';
import { invalidateKho } from '../storage/khoSnapshot';
import PrintPage from './PrintPage';
import { prefs } from '../test/fakePreferences';

vi.mock('@capacitor/preferences', () => import('../test/fakePreferences'));
vi.mock('@capacitor/app', () => ({ App: { addListener: async () => ({ remove: () => {} }) } }));
vi.mock('../plugins/safNative', () => ({ SafNative: {} }));

let kho: FakeKho;
beforeEach(() => {
  prefs.clear();
  prefs.set('saf_root_uri', ROOT);
  kho = fakeKho();
  Object.assign(SafNative, kho.saf);
  kho.put('Logic/bai1.pdf');
  kho.put('Logic/bai1.json', '{}');
  kho.put('Logic/bai1.print.json', '{}');
  kho.mkdir('_print');
  kho.mkdir('_inbox');
  invalidateKho();
});

function renderPrint() {
  render(
    <IonApp>
      <IonReactMemoryRouter history={createMemoryHistory({ initialEntries: ['/print'] })}>
        <IonRouterOutlet>
          <Route exact path="/print" component={PrintPage} />
        </IonRouterOutlet>
      </IonReactMemoryRouter>
    </IonApp>,
  );
}

describe('PrintPage: a kho Android will not list', () => {
  it('lists what is flagged for printing', async () => {
    renderPrint();
    expect(await screen.findByText('bai1')).toBeInTheDocument();
    expect(screen.queryByText(/Khởi động lại máy/)).not.toBeInTheDocument();
  });

  // dGen1, 2026-10-17: the list came up empty as if nothing needed printing.
  it('tells Gú to restart the phone instead of saying nothing needs printing', async () => {
    kho.state.hideAll = true;
    kho.state.rejectHidden = true;
    renderPrint();
    expect(await screen.findByText(/Khởi động lại máy/)).toBeInTheDocument();
    expect(screen.queryByText('Chưa có tài liệu nào cần in.')).not.toBeInTheDocument();
  });
});
