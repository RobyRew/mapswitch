# Security

MapSwitch is a privacy-first map link redirector. This document is the threat model,
the controls that back it, accepted residual risks, and the deploy hardening checklist.

## Threat model

**Assets:** (signed-in only) user credentials, sessions, saved-link coordinates + history.
Anonymous use stores nothing.
**Trust boundary:** edge Traefik (TLS, CrowdSec) → Node container (non-root) → SQLite file.
**Non-goals:** no anonymous data is stored; no third-party trackers; no secrets in the repo.

## Controls

| Threat | Control | Where |
|---|---|---|
| XSS via injected inline script | Strict CSP: `script-src 'self' <hashes>` — no `'unsafe-inline'` | `src/lib/security/headers.ts` (`buildCSP`), hashes via `scripts/csp-hashes.mjs` |
| Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors 'none'` | `headers.ts` |
| SSRF (short-link expander) | http(s)-only, host allow-list, private/loopback/link-local/metadata IP block on every hop (**the map-domain allow-list is the primary control** — a rebind would need attacker-controlled DNS on an allow-listed domain), EU consent handled via `continue=`, capped hops + timeout, HEAD-only, no cookies | `src/lib/expand/{safeExpand,allowlist,ipGuard}.ts` |
| Injection (JSON endpoints) | `Content-Type` enforced, body size capped, safe parse, then Zod | `src/lib/http/guard.ts` + every `src/pages/api/*` |
| SQL injection | Drizzle ORM parameterized queries only — never `sql.raw` with interpolation | `src/lib/db/*` |
| Open redirect | Same-origin path-only `safeRedirect`; `lang`/slug validated; only registry-built deep links emitted | `src/lib/security/redirects.ts`, `/o`, `/x/[slug]` |
| CSRF | Astro `security.checkOrigin` + cookie `SameSite=Lax` | `astro.config.mjs`, better-auth |
| Credential brute-force / enumeration | better-auth per-path rate limits (DB-backed) + generic responses; app `rateLimit()` on app endpoints; edge CrowdSec/fail2ban | better-auth config, `src/lib/ratelimit/tokenBucket.ts` |
| Session theft | `httpOnly`, `Secure`, `SameSite=Lax`, `__Host-`-safe cookies | better-auth `advanced` |
| Token replay | Verification/reset tokens single-use, 1h expiry, server-side | better-auth |
| Coordinate leakage | `Referrer-Policy: no-referrer` on `/o`, `/x/*`, `/api/*`; coords/labels/links never logged | `headers.ts` |

## Accepted residual risks
- `style-src 'unsafe-inline'` — Astro inlines critical CSS; lower-risk than script injection.
- `COEP: require-corp` is **not** enabled (would risk the OAuth/Umami flows for marginal gain);
  `COOP: same-origin` + `CORP: same-origin` are set.
- The app's in-process rate limiter resets on container restart — the durable layers are
  better-auth's DB-backed limiter and the edge CrowdSec/fail2ban.

## Deploy hardening checklist (Dokploy)

- [ ] App built from the Dockerfile; container port **4321**; domain `maps.robyrew.com` (Traefik TLS).
- [ ] Healthcheck path `/api/health`.
- [ ] **Bind-mount** host `/opt/mapswitch/data` → container `/app/data` (so the SQLite DB lands
      under `/opt/*` and the existing Restic→B2 job captures it). Ensure the dir is writable by the
      container's non-root `app` user.
- [ ] **Backup cron** (host) — consistent SQLite snapshot before the nightly Restic window:
      ```
      50 2 * * *  root  sqlite3 /opt/mapswitch/data/mapswitch.db ".backup '/opt/mapswitch/data/mapswitch.db.bak'"
      ```
- [ ] Secrets set in Dokploy env (never in repo): `BETTER_AUTH_SECRET`, `DB_URL`, `SMTP_*`,
      `GOOGLE_*`, `GITHUB_*`, `APPLE_*`. Generate secrets with `openssl rand -base64 32`.
- [ ] **Traefik rate-limit middleware** on the app router:
      ```yaml
      http:
        middlewares:
          mapswitch-ratelimit:
            rateLimit: { average: 100, burst: 50, period: 1m, sourceCriterion: { ipStrategy: { depth: 1 } } }
      ```
- [ ] **CrowdSec bouncer middleware** (host already runs CrowdSec; enable the
      `crowdsec-bouncer-traefik-plugin` in Traefik's static config, then reference it per-app):
      ```yaml
      http:
        middlewares:
          crowdsec:
            plugin:
              crowdsec-bouncer-traefik-plugin:
                enabled: true
                crowdsecMode: live
                crowdsecLapiKey: ${CROWDSEC_LAPI_KEY}   # cscli bouncers add traefik-mapswitch
                crowdsecLapiHost: crowdsec:8080
      ```
      Attach both to the router: `mapswitch-ratelimit,crowdsec`.
- [ ] After any Astro upgrade or new `client:*` directive: `npm run build && node scripts/csp-hashes.mjs`
      and update `INLINE_SCRIPT_HASHES` in `src/lib/security/headers.ts`.

## Reporting

Email `cosmin.cg22@gmail.com`. Please do not open public issues for vulnerabilities.
