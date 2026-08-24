import { defineConfig } from 'vite';

// Zero-fuss Vite config. `dist` is Vite's default outDir; no need to override.
// `base: './'` produces relative asset URLs so the build works on any Vercel
// deployment URL (production, previews, and static asset CDN paths alike).
export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Allow requests from the E2B preview subdomain / any host.
    allowedHosts: true,
    hmr: { protocol: 'wss', clientPort: 443 },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
});
