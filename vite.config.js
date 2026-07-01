import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  assetsInclude: ['**/*.glsl'],
  server: {
    port: 3000,
    open: true,
  },
});
