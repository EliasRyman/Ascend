import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  base: '/', // For custom domain via Cloudflare
  optimizeDeps: {
    entries: ['index.html'],
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'util'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
});
