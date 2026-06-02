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

Email + password (with email verification), **passkeys** (WebAuthn, the fastest sign-in),
and OAuth (Google, GitHub, Apple). Built on better-auth + Drizzle + SQLite + nodemailer.
Anonymous users are unaffected — they keep stateless `/o` links and nothing is stored.

Required env (Dokploy, never in the repo):

```
DB_URL=file:/app/data/mapswitch.db
BETTER_AUTH_SECRET=        # openssl rand -base64 32
SMTP_HOST=smtp.gmail.com  SMTP_PORT=587
SMTP_USER=cosmin.cg22@gmail.com  SMTP_PASS=<gmail app password>  SMTP_FROM=cosmin.cg22@gmail.com
```

### OAuth credentials — where to get them

Callback URL pattern (production): `https://maps.robyrew.com/api/auth/callback/<provider>`.

- **Google** — [Google Cloud Console](https://console.cloud.google.com/) → *APIs & Services*
  → *OAuth consent screen* (External; scopes openid/email/profile) → *Credentials → Create
  credentials → OAuth client ID → Web*. Authorized redirect URI:
  `https://maps.robyrew.com/api/auth/callback/google` (+ `http://localhost:5176/api/auth/callback/google`
  for dev). → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- **GitHub** — *Settings → Developer settings → OAuth Apps → New*. Homepage
  `https://maps.robyrew.com`; callback `https://maps.robyrew.com/api/auth/callback/github`.
  → `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.
- **Apple** (paid Apple Developer) — *Certificates, IDs & Profiles*:
  1. An **App ID** with *Sign In with Apple* enabled.
  2. A **Services ID** (e.g. `com.robyrew.maps.si` → `APPLE_CLIENT_ID`); configure it with
     domain `maps.robyrew.com` and return URL `https://maps.robyrew.com/api/auth/callback/apple`.
  3. A **Key** with *Sign In with Apple* → download the `.p8` once; note the **Key ID**.
  4. Your **Team ID** (top-right of the membership page).
  5. Generate the client secret JWT and set `APPLE_CLIENT_SECRET` (regenerate before ~180 days):
     ```
     APPLE_TEAM_ID=… APPLE_KEY_ID=… APPLE_CLIENT_ID=com.robyrew.maps.si \
     APPLE_PRIVATE_KEY="$(cat AuthKey_XXXX.p8)" npm run apple:secret
     ```
  Apple rejects `localhost`, so test Apple on the deployed host. Google/GitHub work locally on `:5176`.

Each provider only activates when its env vars are present, so you can add them one at a time.

## Roadmap

More providers (Organic Maps, OsmAnd, HERE) · PWA + Android share-target / iOS
share-extension · bookmarklet/extension.
