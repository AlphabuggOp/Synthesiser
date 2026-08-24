import { defineConfig } from 'vite';

// Vercel autodetects Vite and uses `dist` as the output; we set it explicitly here for clarity.
export default defineConfig({
  root: '.',
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    // Allow the E2B preview subdomain (and any host) so the dev server serves the iframe request.
    allowedHosts: true,
    hmr: {
      // Use secure WebSockets so HMR works through the https preview proxy.
      protocol: 'wss',
      clientPort: 443,
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    target: 'es2020',
  },
});
