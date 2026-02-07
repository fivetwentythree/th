import { defineConfig } from 'vite';

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base =
  process.env.BASE_PATH ||
  (process.env.GITHUB_ACTIONS && repo ? `/${repo}/` : '/');

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
