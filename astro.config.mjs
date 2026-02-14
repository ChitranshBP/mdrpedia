// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://mdrpedia.com',

  // Astro 5: 'static' is default. Server-rendered routes use `export const prerender = false`
  output: 'static',

  adapter: node({
      mode: 'standalone',
  }),

  integrations: [react()],
});