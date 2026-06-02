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

  // CSRF: reject cross-origin form/JSON POSTs (Astro v5 default; pinned to make
  // it explicit and guard against a future config regression).
  security: { checkOrigin: true },

  // Locale routing is handled manually via the src/pages/[lang]/ tree + our own
  // i18n utils (t/path). We deliberately do NOT use Astro's `i18n` config: with
  // prefixDefaultLocale it marks top-level routes (/o, /x/:slug) as 404 even when
  // they render. Plain dynamic [lang] routing avoids that.
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
  },

  build: {
    inlineStylesheets: 'auto',
    assets: '_astro',
  },
});
