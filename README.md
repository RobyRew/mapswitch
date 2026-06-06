# MapSwitch

A privacy-first **universal map link redirector**. Someone sends you a Google Maps
link but you'd rather use Apple Maps, Waze or Radarbot? Paste it and open it in the
app *you* like. Or share a neutral link and let whoever opens it pick *their* app.

Think "song.link, but for map locations".

## How it works

- **Receiver** — paste any map link (Google, Apple, Waze, Yandex, OSM), bare
  `lat,lng`, a `geo:` URI, or a Plus Code → MapSwitch extracts the location → you
  pick the app. Short links (`maps.app.goo.gl`) are expanded server-side.
- **Sender** — generate a neutral `…/o?ll=lat,lng&q=Label` link. The place lives in
  the URL; nothing is stored on the server.
- **Frictionless default** — your pick is remembered in the browser and opened
  automatically next time, with an always-visible *Change / Reset* control.

## Stack

Astro 5 (`output: 'server'` + `@astrojs/node` standalone) · React 19 islands ·
Tailwind 4 · TypeScript strict · Zod · Vitest. Deploys as a Node container.

## Develop

```bash
npm install
npm run dev        # http://localhost:5176
npm run test       # vitest (providers, parser, SSRF guard)
npm run typecheck  # astro check + tsc
npm run build      # → dist/  (astro check then build)
npm run preview    # node ./dist/server/entry.mjs
```

## Architecture

```
src/lib/providers/   data-driven registry — one file + one line adds a map app
src/lib/parse/       isomorphic parse pipeline (runs in the browser too)
src/lib/expand/      SSRF-hardened short-link expander (server only)
src/lib/share/       stateless /o link encode/decode
src/lib/security/    CSP + security headers (single source of truth)
src/lib/db/          dormant accounts/DB seam (getStore() → null today)
src/islands/         React UI (paste box, chooser, share generator, /o handler)
src/pages/           prerendered marketing + on-demand /o and /api/*
```

### Adding a map app

Create `src/lib/providers/<id>.ts` exporting a `Provider` (a `parse(url)` for input
and/or a `link(target, platform)` for output), then add it to the array in
`src/lib/providers/registry.ts`. If it has short links, add its hosts to
`src/lib/expand/allowlist.ts`. Add a test table under `tests/providers/`.

## Privacy & safety

- **No location logging.** Coordinates, labels and full links never hit a log or
  analytics event.
- **Stateless share links.** The place is in the URL; there is no database of places.
- **SSRF-hardened expander.** Following short links is restricted to an allow-list of
  map domains, with private/loopback/link-local/metadata IPs blocked on every hop,
  capped redirects and a wall-clock timeout. See `src/lib/expand/`.
- **Rate limiting** on `/api/*`, **Zod validation** on all input, strict **CSP** and
  `no-referrer` on coordinate-bearing routes (`/o`, `/api/*`).

## Deploy (Dokploy)

1. New Application from this Git repo, **Dockerfile** build.
2. Container port **4321**; attach your domain (Traefik handles TLS).
3. Healthcheck path **`/api/health`**.
4. Env vars (see `.env.example`): `PUBLIC_SITE_URL`, optional `PUBLIC_UMAMI_*`,
   `EXPAND_*`, `RATE_LIMIT_*`.
5. Mount a volume **host `/opt/mapswitch/data` → container `/app/data`** so the SQLite
   DB is captured by Restic; install the backup cron from `SECURITY.md`.
6. Set the account env vars (below). Migrations run automatically at container start.

## Accounts

Authentication is delegated to the self-hosted **Logto** identity provider
(`auth.robyrew.com`) — one account works across every RobyRew app (SSO). Logto
hosts the whole sign-in experience: email + password, **passkeys** (WebAuthn),
social (Google, GitHub, Microsoft, Discord, Meta, Apple), MFA, and verification
emails. MapSwitch is registered as a **Traditional Web** Logto app: tokens are
stored server-side (SQLite `logto_sessions`) and the browser holds only an opaque
`ms_sid` cookie. Anonymous users are unaffected — stateless `/o` links store nothing.

Required env (Dokploy, never in the repo):

```
DB_URL=file:/app/data/mapswitch.db
LOGTO_ENDPOINT=https://auth.robyrew.com
LOGTO_APP_ID=<from Logto>
LOGTO_APP_SECRET=<from Logto>      # confidential client; server-only
```

Register on the Logto Application: redirect URI `https://maps.robyrew.com/api/auth/callback`,
post sign-out redirect `https://maps.robyrew.com/`. Social providers + MFA are
configured **once in Logto**, not per app. Full setup + clean-cutover steps:
**[`docs/auth-logto.md`](docs/auth-logto.md)**.

## Install (PWA) & sharing

MapSwitch is an installable PWA (web app manifest + a minimal, privacy-preserving
service worker — it caches only the static shell, never `/api/*` or your links).

- **Android / desktop Chrome** — *Add to Home Screen / Install*. Once installed,
  MapSwitch shows up in the system **Share sheet**: share a map link (or any text
  with a link in it) from another app and it opens here and resolves automatically.
  This uses the [Web Share Target API](https://developer.mozilla.org/docs/Web/Manifest/share_target)
  → `GET /share-target`.
- **iOS / Safari** — *Share → Add to Home Screen* for the app icon. iOS doesn't let
  PWAs register as share targets, so to get MapSwitch into the share sheet make a
  one-step **Shortcut**: *Shortcuts → ＋ → Receive “URLs” and “Text” from Share Sheet
  → Open URL* `https://maps.robyrew.com/share-target?text=[Shortcut Input]`, then turn
  on *Show in Share Sheet*. Sharing a link to it opens MapSwitch and resolves it.

App icons are generated from `public/favicon.svg` with `npm run icons`.

## Roadmap

More providers (Organic Maps, OsmAnd, HERE) · native iOS share-extension app ·
bookmarklet/extension.
