// vite.config.ts

import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // <-- Make sure this is uncommented

// ESM-safe __dirname for Vite config
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.APP_VERSION': JSON.stringify(packageJson.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    // Re-enabled PWA plugin with explicit SPA fallback
    VitePWA({
      registerType: 'autoUpdate', // Keeps the service worker updated automatically
      includeAssets: ['robots.txt', 'icons/*.svg', 'icons/*.png'], // Assets to precache
      strategies: 'generateSW', // Auto-generate SW with Workbox
      workbox: {
        // Explicitly tell Workbox to serve index.html for SPA navigation requests
        navigateFallback: '/index.html',

        // Optional: You might enable this later if needed, but start without it to ensure basics work.
        // navigationPreload: true,

        // Define which assets the service worker should precache
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff,woff2,ttf,eot}'],

        // Runtime caching rules (e.g., for external assets like Google Fonts)
        runtimeCaching: [
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst', // Serve from cache first, fallback to network
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10, // Limit number of cached fonts
                maxAgeSeconds: 60 * 60 * 24 * 365, // Cache for 1 year
              },
              cacheableResponse: {
                statuses: [0, 200], // Cache opaque responses too (important for cross-origin)
              },
            },
          },
          // You could add more rules here for other external assets or API calls
        ],
      },
      // Your Web App Manifest configuration
      manifest: {
        name: 'IAM Tools',
        short_name: 'iam.tools',
        description:
          'A collection of specialized tools for Identity and Access Management (IAM) development and debugging',
        theme_color: '#1a1a1a', // Matches your dark mode theme preference
        background_color: '#f8f9fa', // Light background for splash screen
        display: 'standalone', // Preferred display mode for PWA
        orientation: 'portrait',
        start_url: '/', // Where the app starts
        // Define screenshots for the PWA installation prompt
        screenshots: [
          {
            src: '/icons/social-preview.png',
            sizes: '1200x630',
            type: 'image/png',
            form_factor: 'wide', // For desktop/tablet
            label: 'IAM Tools - Identity and Access Management Tools',
          },
          // You could add more screenshots for different form factors (e.g., 'narrow' for mobile)
        ],
        // Define the icons for various platforms and sizes
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any maskable', // Maskable allows adaptive icons
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable', // Large icon for stores/splash screens
          },
        ],
      },
    }),
  ],
  // Resolve aliases (like @/*)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Optional: Server configuration (defaults are usually fine for SPA)
  // server: {
  //   // Defaults handle history fallback for SPAs
  // }
})
