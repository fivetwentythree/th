import { defineConfig } from 'vite';

// The GitHub Pages custom domain serves this project from its own root.
// BASE_PATH remains available if the site is ever deployed beneath a path again.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
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
