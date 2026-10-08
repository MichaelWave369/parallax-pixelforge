import {defineConfig} from 'vite';

// GitHub project Pages URL: /parallax-pixelforge/
// Keep this explicit so JS/CSS bundles resolve on GitHub Pages, not domain root.
export default defineConfig({
  base: '/parallax-pixelforge/',
  build: {outDir: '../dist', emptyOutDir: true, sourcemap: false},
});
