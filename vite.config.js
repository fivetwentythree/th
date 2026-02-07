import { defineConfig } from 'vite';

export default defineConfig({
  base: '/th/', // GitHub Pages subdirectory
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        thoughts: 'thoughts.html',
        chats: 'chats.html',
        chatsIndex: 'chats/index.html'
      }
    },
    minify: 'terser',
    cssMinify: true
  },
  server: {
    open: true
  }
});
