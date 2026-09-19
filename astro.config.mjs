// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://mdrpedia.com',

  // Output mode: server for SSR with prerender for static pages
  output: 'server',

  adapter: node({
    mode: 'standalone',
  }),

  integrations: [react()],

  // Clinical trial ids that were corrected in the September 2026 content refresh.
  // The old slugs were live URLs, so they redirect rather than 404.
  redirects: {
    '/trials/pf-07304814': '/trials/pf-07817883',
    '/trials/regn-rsa': '/trials/cemdisiran-gmg',
    '/trials/malaria-vaccine-r21': '/trials/rtss-malaria',
  },

  // Image optimization settings
  image: {
    // Use sharp for local image optimization
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        limitInputPixels: false,
      },
    },
    // Remote image domains that are allowed
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.wikipedia.org',
      },
      {
        protocol: 'https',
        hostname: '**.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
  },

  // Build performance
  vite: {
    build: {
      // Code splitting for better caching
      rollupOptions: {
        output: {
          // Vite 8 / Rolldown only accepts the function form of manualChunks.
          manualChunks(id) {
            if (/node_modules\/(react|react-dom)\//.test(id)) return 'react-vendor';
          },
        },
      },
    },
    // Optimize deps
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
  },
});