// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import remarkGfm from 'remark-gfm';
import { remarkVaultLinks } from './src/plugins/remark-vault-links.mjs';

const siteBase = '/woer';
const publishedSlugs = [
  'lore',
  'world_physics',
  'races',
  'hearts',
  'lightning_types',
  'society',
  'city',
  'factions',
  'characters',
  'philosophy'
];

// https://astro.build/config
export default defineConfig({
  site: 'https://neonick.github.io',
  base: siteBase,
  integrations: [react()],
  markdown: {
    remarkPlugins: [
      remarkGfm,
      [remarkVaultLinks, { basePath: siteBase, publishedSlugs }]
    ]
  },

  vite: {
    plugins: [tailwindcss()]
  }
});
