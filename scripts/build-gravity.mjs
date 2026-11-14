import {cp, mkdir, readdir} from 'node:fs/promises';
import {build} from 'esbuild';

await mkdir('dist/js',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
const pages = (await readdir('.')).filter(file => file.endsWith('.html'));
const scripts = (await readdir('js')).filter(file => file.endsWith('.js')).map(file => 'js/'+file);
await Promise.all([...pages,...scripts,'image','places','css','planner-sw.js','.openai/hosting.json'].map(path =>
  cp(path,'dist/'+path,{recursive:true}),
));

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
