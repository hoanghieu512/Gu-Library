import React from 'react';
import ReactDOM from 'react-dom/client';
// CSS Ionic phải nạp TRƯỚC theme/variables.css để token override (nâu) thắng
// palette mặc định (#3880ff) trong core.css. Trước đây nạp ở App.tsx (sau) → blue rò rỉ.
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import './theme/fonts';
import './theme/variables.css';
import './theme/nav.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
