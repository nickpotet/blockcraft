import { defineConfig } from 'vite';

// В проде base = '/blockcraft/' (проект живёт в подпути GitHub Pages),
// в dev — '/' чтобы localhost:5173 открывался как обычно.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/blockcraft/' : '/',
  build: {
    chunkSizeWarningLimit: 600
  }
}));
