import {cp, mkdir, rm} from 'node:fs/promises';
import {build} from 'esbuild';

// Publish only the current application, never old pages or temporary QA files.
await rm('dist',{recursive:true,force:true});
await mkdir('dist/js',{recursive:true});
await mkdir('dist/css',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
const scripts=['data.js','ru-place-names.js','place-hours.js','expenses.js','trips.js'].map(file=>'js/'+file);
await Promise.all(['index.html',...scripts,'image','places/cities','css/trips.css','planner-sw.js','.openai/hosting.json'].map(path=>cp(path,'dist/'+path,{recursive:true})));

await build({
  entryPoints: ['js/gravity-trips.jsx', 'js/fonts.css'],
  outdir: 'dist/gravity',
  bundle: true,
  minify: true,
  format: 'iife',
  jsx: 'automatic',
  define: {'process.env.NODE_ENV': '"production"'},
  loader: {'.woff': 'file', '.woff2': 'file', '.ttf': 'file'},
  assetNames: 'fonts/[name]-[hash]',
});

await cp('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs','dist/js/maplibre-worker.mjs');
