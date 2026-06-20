import { lazy, Suspense } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { home, search, add, settings } from 'ionicons/icons';

import HomePage from './pages/HomePage';
import FolderPage from './pages/FolderPage';
import ViewerPlaceholderPage from './pages/ViewerPlaceholderPage';
import SearchStubPage from './pages/SearchStubPage';
import AddStubPage from './pages/AddStubPage';
import SettingsPage from './pages/SettingsPage';

// Lazy: react-pdf (pdf.js) là bundle nặng + cần DOMMatrix (vỡ trong jsdom test).
// Code-split để không import lúc eval App (smoke test xanh) + tải khi cần.
const ViewerSpike = lazy(() => import('./pages/ViewerSpike')); /* TEMP M5 spike */

/* Ionic core + theming CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

setupIonicReact();

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/home" component={HomePage} />
            <Route exact path="/folder/:uri" component={FolderPage} />
            <Route exact path="/viewer/:uri" component={ViewerPlaceholderPage} />
            {/* TEMP M5 spike — remove in Phase 3 */}
            <Route exact path="/spike" render={() => (
              <Suspense fallback={<div className="ion-padding">Đang tải viewer…</div>}>
                <ViewerSpike />
              </Suspense>
            )} />
            <Route exact path="/search" component={SearchStubPage} />
            <Route exact path="/add" component={AddStubPage} />
            <Route exact path="/settings" component={SettingsPage} />
            <Route exact path="/"><Redirect to="/home" /></Route>
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/home">
              <IonIcon icon={home} /><IonLabel>Trang chủ</IonLabel>
            </IonTabButton>
            <IonTabButton tab="search" href="/search">
              <IonIcon icon={search} /><IonLabel>Tìm</IonLabel>
            </IonTabButton>
            <IonTabButton tab="add" href="/add">
              <IonIcon icon={add} /><IonLabel>Thêm</IonLabel>
            </IonTabButton>
            <IonTabButton tab="settings" href="/settings">
              <IonIcon icon={settings} /><IonLabel>Cài đặt</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
}
