// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
    site: 'https://mdrpedia.com',

    // Astro 5: 'static' is default. Server-rendered routes use `export const prerender = false`
    output: 'static',

    adapter: node({
        mode: 'standalone',
    }),

    vite: {
        ssr: {
            noExternal: ['@prisma/client'],
        },
    },
});
