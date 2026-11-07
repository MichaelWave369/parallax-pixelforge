import {defineConfig} from 'vite';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({
  base:'./',
  build:{
    outDir:'../dist/.publisher-work',
    emptyOutDir:true,
    sourcemap:false,
    target:'es2022',
    cssCodeSplit:false,
    assetsInlineLimit:100_000_000,
    lib:{
      entry:resolve(root,'src/published-main.jsx'),
      name:'PixelForgeOffline',
      formats:['es'],
      fileName:()=> 'runtime.js',
      cssFileName:'runtime'
    },
    rollupOptions:{
      output:{inlineDynamicImports:true}
    }
  }
});
