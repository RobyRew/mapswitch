import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** SQLite + Drizzle singleton. Throws if DB_URL is unset (accounts require a DB). */
export function getDb() {
  if (_db) return _db;
  const url = process.env.DB_URL;
  if (!url) throw new Error('DB_URL is not set — required for accounts/links');
  const path = url.replace(/^file:/, '');
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('foreign_keys = ON');
  _db = drizzle(sqlite, { schema });
  return _db;
}

export type DB = ReturnType<typeof getDb>;
