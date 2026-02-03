import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Relative paths for GitHub Pages
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
