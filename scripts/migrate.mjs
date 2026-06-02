#!/usr/bin/env node
// Apply Drizzle migrations. Runs at container startup (before the server) and
// can be run locally via `npm run db:migrate`. Idempotent.
import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const url = process.env.DB_URL;
if (!url) {
  console.error('DB_URL is not set');
  process.exit(1);
}
const path = url.replace(/^file:/, '');
mkdirSync(dirname(path), { recursive: true });

const sqlite = new Database(path);
sqlite.pragma('journal_mode = WAL');
const db = drizzle(sqlite);
migrate(db, { migrationsFolder: './drizzle' });
sqlite.close();
console.log('migrations applied:', path);
