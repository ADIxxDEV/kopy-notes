import { defineConfig } from 'vite';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {readFile} from 'node:fs/promises';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
// Serve the same public article HTML in development and production preview.
// Vite's SPA fallback otherwise returns the landing page for directory URLs.
const guidePaths=new Set(['/guides/','/guides/online-whiteboard-for-free/','/guides/smart-board-for-teaching/','/guides/digital-board-for-teaching/']);
function serveGuides(root:URL){return async(req:IncomingMessage,res:ServerResponse,next:()=>void)=>{
  const pathname=new URL(req.url??'/', 'http://localhost').pathname;
  if(!pathname.endsWith('/')&&guidePaths.has(`${pathname}/`)){res.statusCode=301;res.setHeader('Location',`${pathname}/`);res.end();return;}
  if(!guidePaths.has(pathname)){next();return;}
  try{const content=await readFile(new URL(`.${pathname}index.html`,root));res.statusCode=200;res.setHeader('Content-Type','text/html; charset=utf-8');res.end(content);}catch{res.statusCode=404;res.end('Guide not found');}
};}
export default defineConfig({
  base: './', resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [{name:'teaching-guide-pages',configureServer(server){server.middlewares.use(serveGuides(new URL('./public/',import.meta.url)));},configurePreviewServer(server){server.middlewares.use(serveGuides(new URL('./dist/',import.meta.url)));}},{name:'local-theme-preview',apply:'serve',configureServer(server){server.middlewares.use('/__local-note3-theme',async(req,res)=>{if(req.method!=='GET'){res.statusCode=405;res.end();return;}try{const data=await readFile(new URL('./.local-themes/org-note3.kopy-theme',import.meta.url)).catch(()=>readFile(new URL('./public/themes/org-note3.kopy-theme',import.meta.url)));const pack=JSON.parse(data.toString('utf8').replace(/^\uFEFF/,''));try{const preference=JSON.parse(await readFile(new URL('./.local-themes/preview-default.json',import.meta.url),'utf8'));pack.previewDefault=preference.theme==='org-note3';}catch{/* No temporary preview preference. */}res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(pack));}catch{res.statusCode=204;res.end();}});}},react(), tailwind(), VitePWA({
    registerType: 'prompt', injectRegister: null, includeAssets: ['icon.svg'],
    manifest: { name: 'Kopy Notes', short_name: 'Kopy Notes', description: 'Your open teaching board', display: 'standalone', start_url: './#/app', theme_color: '#183c36', background_color: '#83d131', icons: [{src:'icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'},{src:'icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}] },
    workbox: { clientsClaim: true, maximumFileSizeToCacheInBytes: 6000000, globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,mjs,kopy-theme,kopy}', 'licenses/*.txt'], navigateFallback: 'index.html', navigateFallbackDenylist: [/^\/guides\//] }
  })], build: { target: 'es2022' }
});
