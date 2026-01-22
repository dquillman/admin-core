import { BUILD_FINGERPRINT } from "./__BUILD_FINGERPRINT__";

(window as any).BUILD_FINGERPRINT = BUILD_FINGERPRINT;
console.log("🧬 Admin Core build:", BUILD_FINGERPRINT);
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './context/AppContext'

import GlobalErrorBoundary from './components/GlobalErrorBoundary';

// Emergency Global Crash Handler (Non-React)
window.onerror = function (message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="background: #1e1b4b; color: #f87171; padding: 2rem; font-family: monospace; min-height: 100vh; display: flex; flex-direction: column;">
        <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">🚨 FATAL ERROR (v0.2.8-EMERGENCY)</h1>
        <p style="margin-bottom: 1rem; color: #fff;">${message}</p>
        <div style="background: #000; padding: 1rem; color: #94a3b8; border-radius: 0.5rem; overflow: auto; flex-grow: 1;">
          ${error?.stack || 'No stack trace available'}
        </div>
        <p style="margin-top: 1rem; color: #64748b;">Source: ${source}:${lineno}:${colno}</p>
        <button onclick="location.reload()" style="margin-top: 2rem; background: #ef4444; color: white; border: none; padding: 1rem 2rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold;">
          HARD RELOAD
        </button>
      </div>
    `;
  }
  return false;
};

window.onunhandledrejection = function (event) {
  console.error("Unhandled Rejection:", event.reason);
};

createRoot(document.getElementById('root')!).render(
  <GlobalErrorBoundary>
    <AppProvider>
      <App />
    </AppProvider>
  </GlobalErrorBoundary>
)

