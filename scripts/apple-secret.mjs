#!/usr/bin/env node
// Generate the Apple "Sign in with Apple" client secret (an ES256 JWT, valid up
// to 180 days). Run locally, paste the output into APPLE_CLIENT_SECRET in Dokploy,
// and regenerate before it expires.
//
//   APPLE_TEAM_ID=XXXX APPLE_KEY_ID=YYYY APPLE_CLIENT_ID=com.robyrew.maps.si \
//   APPLE_PRIVATE_KEY="$(cat AuthKey_YYYY.p8)" node scripts/apple-secret.mjs
import { SignJWT, importPKCS8 } from 'jose';

const { APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CLIENT_ID, APPLE_PRIVATE_KEY } = process.env;
if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_CLIENT_ID || !APPLE_PRIVATE_KEY) {
  console.error('Set APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CLIENT_ID, APPLE_PRIVATE_KEY');
  process.exit(1);
}

const key = await importPKCS8(APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'), 'ES256');
const now = Math.floor(Date.now() / 1000);
const jwt = await new SignJWT({})
  .setProtectedHeader({ alg: 'ES256', kid: APPLE_KEY_ID })
  .setIssuer(APPLE_TEAM_ID)
  .setIssuedAt(now)
  .setExpirationTime(now + 60 * 60 * 24 * 180 - 60)
  .setAudience('https://appleid.apple.com')
  .setSubject(APPLE_CLIENT_ID)
  .sign(key);

console.log(jwt);
