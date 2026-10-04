import { defineConfig } from 'vite';

// While debugging, Vite serves the frontend on 5173 and forwards API calls to
// the backend service (node service/index.js) on 4000. In production the
// service serves both, so no proxy is involved.
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
