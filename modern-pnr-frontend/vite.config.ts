import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf,eot,otf}'],
        maximumFileSizeToCacheInBytes: 5000000, // 5MB
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          // App Shell - Cache First
          {
            urlPattern: /^https:\/\/[^\/]+\/$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-shell',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // API - Network First with fallback
          {
            urlPattern: /^https:\/\/[^\/]+\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              backgroundSync: {
                name: 'api-background-sync',
                options: {
                  maxRetentionTime: 24 * 60, // 24 hours in minutes
                },
              },
            },
          },
          // PNR Status API - Network First with shorter cache
          {
            urlPattern: /^https:\/\/[^\/]+\/api\/pnr\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pnr-status-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 30, // 30 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Static assets - Stale While Revalidate
          {
            urlPattern: /\.(?:js|css|woff2?|ttf|eot|otf)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Images - Cache First
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Google Fonts - Stale While Revalidate
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          // Google Fonts Stylesheets - Stale While Revalidate
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Modern PNR Tracker',
        short_name: 'PNR Tracker',
        description: 'Modern PNR tracking application with real-time updates and offline support',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['travel', 'utilities'],
        lang: 'en',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Add PNR',
            short_name: 'Add PNR',
            description: 'Quickly add a new PNR to track',
            url: '/add-pnr',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'My PNRs',
            short_name: 'My PNRs',
            description: 'View all tracked PNRs',
            url: '/my-pnrs',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
        ],
      },
    }),
    // Bundle analyzer - only in build mode
    ...(process.env.ANALYZE ? [visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })] : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunk for core dependencies
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('framer-motion')) {
              return 'vendor-animations'
            }
            if (id.includes('zustand') || id.includes('@tanstack/react-query')) {
              return 'vendor-state'
            }
            if (id.includes('socket.io') || id.includes('workbox')) {
              return 'vendor-realtime'
            }
            if (id.includes('tailwind') || id.includes('clsx')) {
              return 'vendor-styles'
            }
            return 'vendor-other'
          }
          
          // Feature-based chunks
          if (id.includes('/features/voice/')) {
            return 'feature-voice'
          }
          if (id.includes('/features/analytics/')) {
            return 'feature-analytics'
          }
          if (id.includes('/features/notifications/')) {
            return 'feature-notifications'
          }
          if (id.includes('/features/search/')) {
            return 'feature-search'
          }
          if (id.includes('/features/qr/')) {
            return 'feature-qr'
          }
          if (id.includes('/features/map/')) {
            return 'feature-map'
          }
          
          // UI component chunks
          if (id.includes('/components/ui/') && (
            id.includes('Chart') || 
            id.includes('DataTable') || 
            id.includes('Calendar')
          )) {
            return 'ui-complex'
          }
          
          // Animation chunks
          if (id.includes('/animations/') || id.includes('/components/animations/')) {
            return 'animations'
          }
        },
      },
    },
    // Performance budgets
    chunkSizeWarningLimit: 100, // 100KB warning
    assetsInlineLimit: 4096, // 4KB inline limit
  },
})
