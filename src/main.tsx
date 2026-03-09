import { BUILD_FINGERPRINT } from "./__BUILD_FINGERPRINT__";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).BUILD_FINGERPRINT = BUILD_FINGERPRINT;
console.log("🧬 Admin Core build:", BUILD_FINGERPRINT);
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './context/AppContext'

import GlobalErrorBoundary from './components/GlobalErrorBoundary';

// Emergency Global Crash Handler (Non-React)
// Uses textContent to prevent XSS from error messages
window.onerror = function (message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.textContent = '';
    const container = document.createElement('div');
    container.style.cssText = 'background:#1e1b4b;color:#f87171;padding:2rem;font-family:monospace;min-height:100vh;display:flex;flex-direction:column';

    const h1 = document.createElement('h1');
    h1.style.cssText = 'font-size:1.5rem;margin-bottom:1rem';
    h1.textContent = 'FATAL ERROR';

    const msg = document.createElement('p');
    msg.style.cssText = 'margin-bottom:1rem;color:#fff';
    msg.textContent = String(message);

    const stack = document.createElement('div');
    stack.style.cssText = 'background:#000;padding:1rem;color:#94a3b8;border-radius:0.5rem;overflow:auto;flex-grow:1;white-space:pre-wrap';
    stack.textContent = error?.stack || 'No stack trace available';

    const src = document.createElement('p');
    src.style.cssText = 'margin-top:1rem;color:#64748b';
    src.textContent = `Source: ${source}:${lineno}:${colno}`;

    const btn = document.createElement('button');
    btn.style.cssText = 'margin-top:2rem;background:#ef4444;color:white;border:none;padding:1rem 2rem;border-radius:0.5rem;cursor:pointer;font-weight:bold';
    btn.textContent = 'HARD RELOAD';
    btn.addEventListener('click', () => location.reload());

    container.append(h1, msg, stack, src, btn);
    root.appendChild(container);
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

