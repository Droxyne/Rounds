import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 2300, rollupOptions: { output: { manualChunks(id) { if (id.includes('@babylonjs')) return 'babylon'; } } } }
});
