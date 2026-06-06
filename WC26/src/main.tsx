import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker for Progressive Web App (PWA) support and offline capabilities
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        console.log('[PWA] Service Worker registered successfully: ', reg.scope);
      })
      .catch(err => {
        console.error('[PWA] Service Worker registration failed: ', err);
      });
  });
} else if ('serviceWorker' in navigator) {
  // Register in dev as well to allow offline testing
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        console.log('[PWA SW registered (Dev Mode):', reg.scope);
      })
      .catch(err => {
        console.warn('[PWA] SW Registration Error:', err);
      });
  });
}
