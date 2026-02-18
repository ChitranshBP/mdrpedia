// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://mdrpedia.com',

  // Output mode: static (supports on-demand rendering with adapter)
  output: 'static',

  adapter: node({
    mode: 'standalone',
  }),

  integrations: [react()],
});