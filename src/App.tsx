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
import SearchStubPage from './pages/SearchStubPage';
import AddStubPage from './pages/AddStubPage';
import SettingsPage from './pages/SettingsPage';

// Lazy: react-pdf (pdf.js) is a heavy bundle + needs DOMMatrix (crashes in jsdom tests).
// Code-split so it's not imported when App is evaluated (keeps smoke test green).
const ViewerPage = lazy(() => import('./pages/ViewerPage'));

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
            <Route exact path="/viewer/:uri" render={() => (
              <Suspense fallback={<div className="ion-padding">Đang tải viewer…</div>}>
                <ViewerPage />
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
