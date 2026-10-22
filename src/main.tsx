import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import './styles.css';
import App from './App';
import { ContentProvider } from './content';
const Admin = lazy(() => import('./admin/Admin'));
const PagesAdmin = lazy(() => import('./admin/PagesAdmin'));
const route = window.location.pathname.slice(import.meta.env.BASE_URL.length);
const adminRoute = /^admin(?:\/|\/index\.html)?$/.test(route);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {adminRoute ? (
      <Suspense fallback={<p>Panel yüklənir…</p>}>
        {import.meta.env.MODE === 'pages' ? <PagesAdmin /> : <Admin />}
      </Suspense>
    ) : (
      <ContentProvider>
        <App />
      </ContentProvider>
    )}
  </React.StrictMode>,
);
