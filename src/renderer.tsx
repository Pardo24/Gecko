import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { installTransport } from './lib/transport';

// In desktop Electron, preload.ts already set `window.electron`. In Gecko OS
// kiosk mode (Chromium pointed at localhost), there is no preload — this
// shim wires the same API to HTTP fetch. Idempotent if Electron already ran.
installTransport();

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
