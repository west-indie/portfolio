import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// TODO: Update base to match the repository name when deploying to GitHub Pages.
export default defineConfig({
  base: '/portfolio/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts'
  }
});
