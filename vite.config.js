import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig({
 plugins:[
  react(),
  VitePWA({
   strategies:'injectManifest',
   srcDir:'src',
   filename:'sw.js',
   registerType:'autoUpdate',
   includeAssets:['brand/cana-logo.png'],
   manifest:{
    name:'Les Délices de CANA',
    short_name:'CANA',
    description:'La carte et les réservations des Délices de CANA.',
    theme_color:'#FBF7F0',
    background_color:'#FBF7F0',
    display:'standalone',
    lang:'fr',
    start_url:'/',
    scope:'/',
    icons:[
      {src:'/brand/cana-logo.png',sizes:'any',type:'image/png',purpose:'any maskable'}
    ]
   },
   injectManifest:{globPatterns:['**/*.{js,css,html,svg,png,webp,woff2}']}
  })
 ]
});