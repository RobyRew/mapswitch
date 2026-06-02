#!/usr/bin/env node
// Recompute the SHA-256 hashes of the inline scripts Astro emits, for the CSP in
// src/lib/security/headers.ts. Run after an Astro upgrade or after adding a new
// client:* directive, then paste the output into INLINE_SCRIPT_HASHES.
//   npm run build && node scripts/csp-hashes.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : p;
  });
}

const root = 'dist/client';
const set = new Set();
for (const file of walk(root).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    set.add("'sha256-" + createHash('sha256').update(m[1], 'utf8').digest('base64') + "'");
  }
}
console.log('Inline-script CSP hashes:');
for (const h of set) console.log('  ' + h + ',');
