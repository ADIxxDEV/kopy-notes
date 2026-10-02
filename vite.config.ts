import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  base: './', resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [react(), tailwind(), VitePWA({
    registerType: 'prompt', injectRegister: null, includeAssets: ['icon.svg'],
    manifest: { name: 'Kopy Notes', short_name: 'Kopy Notes', description: 'Your open teaching board', display: 'standalone', start_url: './', theme_color: '#183c36', background_color: '#83d131', icons: [{src:'icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'},{src:'icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}] },
    workbox: { clientsClaim: true, maximumFileSizeToCacheInBytes: 6000000, globPatterns: ['**/*.{js,css,html,svg,png,woff2,mjs}'], navigateFallback: 'index.html' }
  })], build: { target: 'es2022' }
});
