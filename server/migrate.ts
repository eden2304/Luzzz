import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Applies server/schema.sql on every startup. Safe to run repeatedly — every
 * statement uses IF NOT EXISTS (or, for the one-time remind_day_before ->
 * reminders migration, an explicit column-existence check) so an already
 * up-to-date database is a fast no-op.
 */
export async function runMigrations(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  const pool = getPool();
  await pool.query(sql);
  console.log('Database schema is up to date');
}
