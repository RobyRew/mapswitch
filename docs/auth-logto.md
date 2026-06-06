# Auth — Logto integration (mapswitch)

MapSwitch authenticates via the self-hosted **Logto** IdP at `https://auth.robyrew.com`. It is registered as a **Traditional Web** application: the redirect/PKCE/token exchange all happen server-side, and the OIDC tokens are stored **server-side in SQLite** (`logto_sessions`). The browser only ever holds an opaque `ms_sid` cookie — tokens never touch client JS.

See the cross-app recipe in the infra repo (`docs/logto-app-integration.md`) and the operator runbook (Obsidian → VPS-Ionos → *12 / 13*).

## What changed (from better-auth)

- Removed: `better-auth`, `@better-auth/passkey`, `nodemailer`, the custom login/signup/forgot/reset pages, `AuthForm`, the social-provider config, and the `user/session/account/verification/passkey` tables. Logto now owns email/password, social (Google/GitHub/Microsoft/Discord/Meta/Apple), passkeys, MFA, and verification e-mails.
- Kept: the `getUser(request) → SessionUser` seam — every consumer (`api/links`, `api/links/[slug]`, `api/links/claim`, `api/preferences`, the account page) is unchanged.
- Added: `src/lib/auth/logto.ts` (the only module that talks to Logto), the `/api/auth/{sign-in,callback,sign-out,me}` endpoints, and the `users` + `logto_sessions` tables. `users.id` (keyed by the Logto `sub`) is the local user id all app data FKs to.

## Configure the Logto Application

In the Logto admin console (over Tailscale):

1. **Applications → Create → Traditional Web** → name `MapSwitch`.
2. **Redirect URI**: `https://maps.robyrew.com/api/auth/callback`
3. **Post sign-out redirect URI**: `https://maps.robyrew.com/`
4. Copy **App ID** + **App Secret**.

## Environment (`.env` / Dokploy)

```bash
LOGTO_ENDPOINT=https://auth.robyrew.com
LOGTO_APP_ID=<App ID>
LOGTO_APP_SECRET=<App Secret>       # server-only, never in the client bundle
PUBLIC_SITE_URL=https://maps.robyrew.com
DB_URL=file:/app/data/mapswitch.db
```

Local dev: set `PUBLIC_SITE_URL=http://localhost:5176`, register a second redirect URI `http://localhost:5176/api/auth/callback` on the same (or a dev) Logto app.

## Clean cutover (wipes existing accounts)

The cutover was chosen as **clean** — old better-auth accounts are not migrated; everyone re-registers via Logto. Because the schema changed (auth tables dropped, FKs retargeted to `users`), reset the DB + migration baseline:

```bash
# LOCAL
rm -f data/mapswitch.db data/mapswitch.db-wal data/mapswitch.db-shm
rm -rf drizzle/                     # reset migration history (clean cutover)
npm install                         # picks up @logto/node, drops better-auth
npm run db:generate                 # fresh baseline from the new schema
npm run db:migrate
npm run typecheck                   # verify the @logto/node API against the installed version
```

```bash
# PRODUCTION (Dokploy) — data-loss step, do deliberately
# 1. Commit the regenerated drizzle/ baseline + push (Dokploy redeploys).
# 2. Before/at deploy, wipe the prod DB so startup migrate recreates it clean:
ssh cosmin@vps01 'rm -f /opt/mapswitch/data/mapswitch.db*'
# 3. Set LOGTO_* env in Dokploy → redeploy. Container startup runs db:migrate.
```

> ⚠️ This also drops **anonymous** saved links (they live in the same DB). If any need keeping, export `saved_links WHERE userId IS NULL` first. (Anonymous link loss is the trade-off of the simplest clean cutover.)

## Flow

```
/api/auth/sign-in  → set ms_sid cookie, store PKCE under it, redirect to Logto
   (Logto hosts the entire sign-in UI: password, social, passkey, MFA)
/api/auth/callback → exchange code, persist tokens server-side, create users row, return
/api/auth/sign-out → end the Logto SSO session, drop the server session + cookie
/api/auth/me       → { signedIn } probe for client islands on static pages
getUser(request)   → reads ms_sid → Logto getContext() → upsert users → SessionUser
```

## Security notes

- Tokens are **server-side only** (SQLite `logto_sessions`); the browser holds an opaque, httpOnly, Secure, SameSite=Lax `ms_sid`.
- `getContext()` verifies the session/tokens via Logto; we never hand-decode a JWT.
- `?returnTo=` is sanitised to local paths (no `//`, must start with `/`) to block open redirects.
- Redirect + post-logout URIs are exact HTTPS (configured in Logto, no wildcards).
- All DB access is via Drizzle (parameterised). App data keys off `users.id`, never an email.
- Pin `@logto/node` once `npm run typecheck` passes against the installed version; the entire Logto surface is isolated in `src/lib/auth/logto.ts`.
