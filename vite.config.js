import { defineConfig } from 'vite';

export default defineConfig({
  base: '/th/', // GitHub Pages subdirectory
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        thoughts: 'thoughts.html'
      }
    },
    minify: 'terser',
    cssMinify: true
  },
  server: {
    open: true
  }
});
