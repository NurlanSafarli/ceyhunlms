import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import './styles.css';
import App from './App';
import { ContentProvider } from './content';
const Admin = lazy(() => import('./admin/Admin'));
const adminRoute =
  import.meta.env.MODE !== 'pages' && /^\/admin\/?$/.test(window.location.pathname);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {adminRoute ? (
      <Suspense fallback={<p>Panel yüklənir…</p>}>
        <Admin />
      </Suspense>
    ) : (
      <ContentProvider>
        <App />
      </ContentProvider>
    )}
  </React.StrictMode>,
);
