import "./polyfills/buffer"; // must come before other imports that rely on Buffer
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const restorePathFromSpa404Redirect = () => {
  const search = window.location.search;
  if (!search.startsWith('?/')) {
    return;
  }

  const decoded = search.slice(1).replace(/~and~/g, '&');
  const querySeparatorIndex = decoded.indexOf('&');
  const restoredPath = querySeparatorIndex >= 0 ? decoded.slice(0, querySeparatorIndex) : decoded;
  const restoredQuery = querySeparatorIndex >= 0 ? decoded.slice(querySeparatorIndex + 1) : '';

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const normalizedPath = restoredPath.startsWith('/') ? restoredPath : `/${restoredPath}`;
  const nextUrl = `${basePath}${normalizedPath}${restoredQuery ? `?${restoredQuery}` : ''}${window.location.hash}`;

  window.history.replaceState(null, '', nextUrl);
};

restorePathFromSpa404Redirect();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
