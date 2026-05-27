import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { installTransport } from './lib/transport';

// In desktop Electron, preload.ts already set `window.electron`. In Gecko OS
// kiosk mode (Chromium pointed at localhost), there is no preload — this
// shim wires the same API to HTTP fetch. Idempotent if Electron already ran.
installTransport();

// Tag the body with .kiosk when running in the Gecko OS Chromium kiosk so
// CSS can apply overscan-safe padding + bigger touch targets for a TV-far UX.
// We treat "has installToDisk capability" as the canonical "I'm Gecko OS" signal.
window.electron.capabilities()
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  .then(c => { if (c.installToDisk) document.body.classList.add('kiosk'); })
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  .catch(() => {});

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
