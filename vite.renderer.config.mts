import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Dev only: the renderer's HTTP shim (src/lib/transport.ts) calls
    // /api/* on the same origin. In production the server bundle serves
    // both the static UI and the API on :3000, so it's a single origin.
    // In dev, Vite serves the UI on :5173 and the API runs on :3000, so
    // proxy /api through to the backend. Do NOT proxy /assets — Vite
    // serves source assets (icons/*.png) at that path from disk.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
