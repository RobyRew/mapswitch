// Production entrypoint. Wraps the Astro Node standalone `handler` (which serves
// BOTH prerendered static pages and on-demand SSR) so that security headers are
// applied to EVERY response — including the prerendered pages (home, about,
// privacy, /use, settings, offline) that Astro middleware never runs for.
//
// For SSR routes the middleware also sets these headers; Node merges them with
// identical values, so there's no duplication. For static files, this wrapper is
// the only thing that sets them.
//
// Boot order matters: we must disable the adapter's autostart BEFORE importing
// entry.mjs, so the import is dynamic (static imports are evaluated first).
import http from 'node:http';
import { securityHeaders } from './scripts/security-headers.mjs';

process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const { handler } = await import('./dist/server/entry.mjs');

const PORT = Number(process.env.PORT) || 4321;
const HOST = process.env.HOST || '0.0.0.0';
// Runtime-resolved so a Dokploy env var is enough (no rebuild) to allow-list umami.
const UMAMI = process.env.PUBLIC_UMAMI_SCRIPT_URL || null;

const server = http.createServer((req, res) => {
  const pathname = (req.url || '/').split('?')[0].split('#')[0];
  for (const [key, value] of Object.entries(securityHeaders(pathname, UMAMI))) {
    res.setHeader(key, value);
  }
  handler(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`mapswitch listening on http://${HOST}:${PORT}`);
});

// Clean shutdown so the container stops promptly (SIGTERM from Docker/Dokploy).
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
