// vite.config.js — Chrome Extension build configuration for Brutus.
//
// WHY THIS CONFIGURATION IS NEEDED:
// 1. Chrome extensions require a built HTML file as the popup — not a JSX file.
//    The original manifest pointed to src/popup/Popup.jsx which Chrome cannot load.
//    We need Vite to build popup.html → dist/popup.html with the popup bundle.
//
// 2. The dashboard is a full-page tab opened from the popup.
//    index.html → dist/index.html with the dashboard bundle.
//
// 3. Content scripts and the service worker are plain JS files that Chrome
//    loads directly. We copy them into dist/ using rollupOptions.input would
//    bundle them. Instead we use a simple vite-plugin-static-copy approach —
//    but since we cannot add packages, we list them as additional rollup inputs
//    so Vite includes them in the build output unchanged.
//
// 4. The test suite lives in tests/javascript/ relative to the repo root.
//    We tell Vitest to look there using the test.include pattern.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        const src = resolve(__dirname, 'manifest.json');
        const dest = resolve(__dirname, 'dist/manifest.json');
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }
    }
  ],

  // Build configuration for the Chrome extension.
  build: {
    // Output goes to extension/dist — Chrome loads the unpacked extension from here.
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        // Dashboard tab — mounted by src/main.jsx
        main: resolve(__dirname, 'index.html'),

        // Popup — mounted by src/popup-main.jsx
        popup: resolve(__dirname, 'popup.html'),

        // Service worker — Prachi's file.
        serviceWorker: resolve(__dirname, 'src/background/serviceWorker.js'),

        // Content scripts — Kushagra's files.
        instagram: resolve(__dirname, 'src/content/instagram.js'),
        followers: resolve(__dirname, 'src/content/followers.js')
      },

      output: {
        // Keep the entry file names matching manifest.json references.
        entryFileNames: (chunk) => {
          if (chunk.name === 'serviceWorker') return 'src/background/serviceWorker.js';
          if (chunk.name === 'instagram')     return 'src/content/instagram.js';
          if (chunk.name === 'followers')     return 'src/content/followers.js';
          return '[name].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },

  // Vitest configuration — point it at the tests folder in the repo root.
  test: {
    include: ['../tests/javascript/**/*.test.js'],
    environment: 'node'
  }
});
