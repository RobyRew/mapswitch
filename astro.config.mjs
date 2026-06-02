// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// Public site URL — override per environment via PUBLIC_SITE_URL.
const SITE = process.env.PUBLIC_SITE_URL || 'https://maps.robyrew.com';

export default defineConfig({
  site: SITE,

  // ── Backend ───────────────────────────────────────────────────────
  // Unlike the static portfolio, this app needs a server (to safely
  // expand short links). Every route is server-rendered BY DEFAULT now;
  // static marketing pages opt back in with `export const prerender = true`.
  output: 'server',
  adapter: node({ mode: 'standalone' }),

  trailingSlash: 'ignore',
  compressHTML: true,

  // ── Locale routing ────────────────────────────────────────────────
  // Same shape as the portfolio: four locales, EN default served at /en/.
  i18n: {
    locales: ['en', 'es', 'ca', 'ro'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
  },

  build: {
    inlineStylesheets: 'auto',
    assets: '_astro',
  },
});
